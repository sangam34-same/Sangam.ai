# Project Constitution

## SECURITY PRINCIPLES

These principles take precedence over performance and developer convenience.

### 1. Zero Trust by Default
Every request is untrusted until proven otherwise. Never assume a request is safe because it comes from "our frontend." Validate everything on the server.

### 2. Defense in Depth
Every security control must have a backup layer. Example: JWT verification AND rate limiting AND input sanitization. Never rely on a single control.

### 3. Principle of Least Privilege
Users, services, and database connections receive the minimum permissions required to perform their function. No admin access by default.

### 4. Secure by Default
New endpoints are protected by default. Developers must explicitly opt out of security (not opt in). Every route goes through auth middleware unless explicitly marked public.

### 5. Fail Securely
If any security check fails, deny access. Never fall back to an insecure state. Example: if JWT verification errors, return 401 — never proceed with an unauthenticated request.

### 6. Secrets Never Touch Code
All secrets (JWT keys, DB URIs, API keys) live in .env files and are never committed. .env.example shows the shape but not real values. Use strong, randomly-generated secrets (min 32 chars).

### 7. Never Log Sensitive Data
Passwords, tokens, and PII must never appear in logs, error messages, or API responses. Implement a logger that redacts sensitive fields automatically.

### 8. Dependency Hygiene
Run npm audit before every deployment. No high or critical vulnerabilities allowed in production. Pin dependency versions in package.json (no ^ or ~ for critical packages).

### 9. Encryption in Transit and at Rest
All production traffic must be HTTPS. MongoDB Atlas must use TLS. Passwords hashed with bcrypt (saltRounds >= 12). Reset tokens and session tokens are cryptographically random (crypto.randomBytes).

### 10. Security Regression Tests
Every security-critical feature must have automated tests. Examples: "login with SQL injection payload returns 401", "expired JWT returns 401", "rate limit kicks in at 6th request".

### 11. Audit Everything
Every auth event (login, logout, failed login, password reset) is logged with timestamp, IP, and user agent — but never the password or token value.

### 12. Assume Breach
Design systems as if an attacker already has partial access. Rotate secrets regularly. Expire tokens aggressively. Limit blast radius of any single compromised credential.