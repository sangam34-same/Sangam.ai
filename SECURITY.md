# Security Documentation — Sangam.ai Authentication System

## Overview

This document describes the security architecture of the Sangam.ai authentication system. Every design decision prioritizes security over performance and developer convenience, following the project's Security Constitution and OWASP Top 10 mitigations.

## Threat Model

We defend against:
1. Credential Stuffing
2. Brute Force
3. SQL/NoSQL Injection
4. XSS (Cross-Site Scripting)
5. CSRF (Cross-Site Request Forgery)
6. Token Theft
7. Session Fixation
8. Password Reset Abuse
9. User Enumeration
10. Timing Attacks
11. Replay Attacks
12. Man-in-the-Middle
13. Insider Threat
14. Denial of Service
15. Token Leakage via Logs

## Architecture

### Dual-Token Strategy

| Token | Type | Lifetime | Storage | Rotation |
|-------|------|----------|---------|----------|
| Access Token | JWT (HS256/RS256) | 15 minutes | Memory (Zustand) | N/A (short-lived) |
| Refresh Token | Opaque (crypto.randomBytes 64) | 7 days | httpOnly + Secure + SameSite=Strict cookie | Every use, old invalidated |

**Why this design?**
- Short-lived access tokens limit blast radius of token theft
- Refresh tokens in httpOnly cookies prevent XSS theft
- Refresh token rotation + reuse detection detects compromised tokens
- Access token in memory (not localStorage) survives XSS

### Token Flow

```
Register/Login
    │
    ▼
┌─────────────────────────────────────┐
│  Server validates credentials       │
│  Creates Session document in DB     │
│  (refreshTokenHash, ip, userAgent)  │
└─────────────────────────────────────┘
    │
    ├─► Access Token (JWT) → Response body → Memory (Zustand)
    │
    └─► Refresh Token (opaque) → httpOnly Cookie → Browser
```

```
API Request (Protected Route)
    │
    ▼
┌─────────────────────────────────────┐
│  Access Token in Authorization:     │
│  Bearer header                      │
│  verifyAuth middleware validates    │
│  signature, expiry, issuer, audience│
└─────────────────────────────────────┘
```

```
Token Refresh (/api/auth/refresh-token)
    │
    ▼
┌─────────────────────────────────────┐
│  Refresh Token from httpOnly cookie │
│  verifyRefreshToken middleware:     │
│  - Hash token, lookup in DB         │
│  - Check revoked/expired            │
│  - REUSE DETECTION: if revoked      │
│    reason=token_reuse → revoke ALL  │
│    user sessions (assume compromise)│
│  - Rotate: revoke old, create new   │
│  - Issue new access + refresh token │
└─────────────────────────────────────┘
```

## Password Security

### Requirements (Enforced Server-Side)
- Minimum 12 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character
- Not in top 10,000 common passwords (zxcvbn + custom list)
- Does not contain user's name, email, or business name
- zxcvbn score ≥ 3

### Hashing
- bcrypt with saltRounds = 12 (configurable via `BCRYPT_SALT_ROUNDS`)
- Hashing occurs ONLY in User model `pre('save')` hook
- Service layer passes plain password — never pre-hashes
- `isModified('password')` guard prevents double-hashing

### Password Reset
- Token: `crypto.randomBytes(32).toString('hex')` (256-bit entropy)
- Stored in DB as SHA-256 hash (never plaintext)
- Expires in 15 minutes
- Single-use: invalidated after successful reset
- On reset: ALL sessions revoked, notification email sent
- Rate limited: 3 requests/hour per email

## Input Validation & Injection Prevention

### Backend (Never Trust Frontend)
- `express-validator` on every field
- Email: `validator.isEmail` + normalize + lowercase
- Name: max 100 chars, strip HTML tags, reject `<script>`
- Phone: E.164 format (`/^\+[1-9]\d{1,14}$/`)
- All strings: `maxLength`, `trim`
- Strict schema validation: reject unexpected fields
- Body size limit: 10KB

### NoSQL Injection Prevention
- `express-mongo-sanitize` strips `$` and `.` from all inputs
- Mongoose schema validation as second layer
- Never concatenate user input into queries

### XSS Prevention
- Frontend: No `dangerouslySetInnerHTML` without sanitization
- CSP headers via Helmet: `script-src 'self'`, `style-src 'self' 'unsafe-inline'`
- Access token in memory (not localStorage)
- DOMPurify for any HTML rendering (future)

## Rate Limiting (Layered)

| Layer | Limit | Window | Key |
|-------|-------|--------|-----|
| Global | 100 req | 15 min | IP |
| Auth endpoints | 5 req | 15 min | IP + email |
| Per-account | 10 failed | 1 hour | email |
| Password reset | 3 req | 1 hour | IP + email |

### Progressive Delay
- After 3rd failed attempt: +1s delay
- After 4th: +2s
- After 5th: +4s (exponential backoff)

### Account Lockout
- After 10 failed attempts in 15 min: lock for 30 min
- Send notification email on lock
- Same error message for "user not found" and "wrong password"

## User Enumeration Prevention

| Endpoint | Behavior |
|----------|----------|
| Register | If email exists: return generic 200, send notification to existing user. Never 409. |
| Login | Identical response time + message for unknown email vs wrong password |
| Forgot Password | Always 200 with generic message |
| Timing | Dummy bcrypt hash for non-existent users |

## CORS Configuration

```javascript
origin: [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
credentials: true
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
maxAge: 86400
```

## Cookie Security

```javascript
{
  httpOnly: true,        // JS cannot access
  secure: true,          // HTTPS only (production)
  sameSite: 'strict',    // CSRF protection
  path: '/api/auth',     // Only sent to auth routes
  maxAge: 7 days,        // Matches refresh token expiry
  signed: true           // Tamper detection
}
```

## CSRF Protection

Primary: `SameSite=Strict` on refresh token cookie
Secondary: Require `X-Requested-With: XMLHttpRequest` on state-changing requests
Future: Double-submit cookie pattern for extra safety

## HTTP Security Headers (Helmet)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
```

## Logging & Monitoring

### Logged Events
- `register_success`, `register_attempt_existing`
- `login_success`, `login_failed_wrong_password`, `login_failed_user_not_found`, `login_account_locked`
- `logout_success`
- `token_refresh`, `token_refresh_reuse_detected`
- `forgot_password_token_created`, `forgot_password_user_not_found`
- `reset_password_success`, `reset_password_invalid_token`
- `password_change_notification`
- `session_revoked`, `sessions_revoked`

### Log Format
```json
{
  "event": "login_success",
  "timestamp": "2026-10-06T12:00:00.000Z",
  "userId": "507f1f77bcf86cd799439011",
  "email": "j***@example.com",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "success": true
}
```

### Redaction Rules (Automatic)
- Never log: passwords, tokens, full emails, authorization headers, cookies
- Emails masked: `j***@example.com`
- Uses Pino with custom redaction paths

### Alerting Thresholds
- 10+ failed logins for one account
- 100+ failed logins from one IP
- Any refresh token reuse detection

## JWT Security

- Algorithm: HS256 (dev), RS256 (production with asymmetric keys)
- Secret: min 32 chars, generated with `crypto.randomBytes(32).toString('hex')`
- Payload: `{ sub, email, role, iat, exp, jti }`
- `jti` for future token revocation list
- Never include sensitive data in payload (base64, not encrypted)
- Verify: signature + expiry + issuer + audience

## Dependency Hygiene

- `npm audit --production` before every deployment
- No high/critical vulnerabilities allowed in production
- Pin exact versions for security-critical packages (bcrypt, jsonwebtoken, helmet, express-rate-limit)
- `npm ci` in CI/CD for reproducibility
- Dependabot alerts enabled

## Database Security

- MongoDB user: `readWrite` only on app database (no admin)
- Connection: SRV with TLS (`mongodb+srv://`)
- Atlas IP whitelist (no `0.0.0.0/0` in production)
- Atlas auditing enabled
- Encrypted backups
- MongoDB port not exposed to public internet

## Session Management

### Session Document
```javascript
{
  userId: ObjectId,
  refreshTokenHash: "sha256(...)",  // Hashed — DB leak ≠ token leak
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  createdAt: Date,
  expiresAt: Date,        // TTL index auto-cleans
  revokedAt: Date|null,
  revokedReason: "logout" | "password_change" | "token_reuse" | "admin_revoke" | "expired",
  replacedBy: ObjectId|null  // For rotation chain
}
```

### Revocation Triggers
- User logout → revoke current session
- Password change → revoke ALL sessions
- Refresh token reuse → revoke ALL sessions (assume compromise)
- Admin action → revoke specific or all sessions
- Token expiry → TTL index auto-cleans

## Error Handling

### Production
- Never return stack traces, internal codes, DB errors
- Generic messages: "Invalid credentials", "Something went wrong"
- Full error logged server-side with correlation ID
- Correlation ID returned to client for support

### Development
- Stack traces included
- Detailed validation errors

## Frontend Security

### State Management
- Zustand store with `persist` middleware
- Only `user` and `isAuthenticated` persisted
- Access token in `sessionStorage` (cleared on tab close)
- Refresh token in httpOnly cookie (inaccessible to JS)

### Form Security
- `autoComplete="off"` on register password fields
- `autoComplete="new-password"` / `"current-password"` appropriately
- Show/hide password toggles
- Real-time password strength meter (zxcvbn)
- Auto-clear sensitive fields on unmount
- Never log form data to console in production
- Generic error messages to user

### Route Protection
- `ProtectedRoute` checks `isAuthenticated` from store
- On app load: `fetchMe()` validates token with backend
- 401 on `/me` → auto logout + redirect to `/login`

## Deployment Checklist

- [ ] All secrets in `.env` (never committed)
- [ ] `.env.example` shows shape only
- [ ] JWT secrets ≥ 32 chars, randomly generated
- [ ] Cookie secret ≥ 32 chars, randomly generated
- [ ] `NODE_ENV=production`
- [ ] `HTTPS` enforced (reverse proxy)
- [ ] MongoDB Atlas: TLS, IP whitelist, auditing
- [ ] `npm audit --production` passes
- [ ] Rate limiter uses Redis in production
- [ ] Security regression tests pass in CI
- [ ] CSP headers configured for your domain
- [ ] HSTS preload submitted (if applicable)

## Testing

Run security regression tests:
```bash
cd backend && npm test
```

Key test scenarios:
- Password hashing uses bcrypt saltRounds 12
- No password in logs/errors/responses
- Access token expires in 15 min, stored in memory
- Refresh token httpOnly, Secure, SameSite=Strict, hashed in DB
- Refresh token rotation + old token invalidation
- Login timing attack resistance (±50ms)
- 6th login attempt in 15 min → 429
- 10th failed login → account lock + email
- Registration with existing email → generic success
- Reset token hashed, 15 min expiry, single-use
- JWT signature verified on protected routes
- Expired JWT → 401 generic
- XSS payload rejected/escaped
- NoSQL injection (`{"$gt":""}`) blocked
- CORS blocks unauthorized origins
- Security headers present (HSTS, CSP, X-Frame-Options)
- Password change revokes all sessions
- Successful login logged with IP/UA, no password
- Failed logins logged and rate-limited

## Incident Response

### Refresh Token Reuse Detected
1. All user sessions immediately revoked
2. User forced to re-authenticate
3. Security alert triggered
4. Investigation: check logs for suspicious IPs

### Account Lockout
1. User receives email notification
2. Lock expires automatically after 30 min
3. User can use "Forgot Password" to regain access

### Suspicious Activity
1. Check auth event logs
2. Revoke affected sessions
3. Rotate secrets if compromise suspected
4. Notify affected users per policy

## Future Enhancements

- [ ] Two-Factor Authentication (TOTP)
- [ ] OAuth (Google, Microsoft)
- [ ] Device fingerprinting for anomaly detection
- [ ] Adaptive authentication (risk-based)
- [ ] Hardware security keys (WebAuthn)
- [ ] Centralized SIEM integration
- [ ] Automated secret rotation