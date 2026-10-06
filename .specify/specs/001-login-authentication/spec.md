# Feature 001: Login & Authentication

**Status:** Draft | **Version:** 1.0.0 | **Date:** 2026-10-06
**Constitution:** `.specify/memory/constitution.md` v1.1.0
**Stack:** frontend/ React + Tailwind + zustand | backend/ Node.js + Express + MongoDB + Mongoose + bcrypt + JWT

---

## 1. Overview

Implement full authentication for the monorepo:
- Register, Login, Logout, Get Current User (`/me`), and `protect` middleware for all future private routes.
- Backend owns all auth logic (MVSC). Frontend owns UI + zustand session state, talks to backend only via REST JSON.
- Passwords never stored / returned in plain text. bcrypt-only hashing. JWT Bearer auth.

## 2. User Stories

1. **US-1 Register:** As a new user, I can register with name, email, password so I get an account + auto-login token.
2. **US-2 Login:** As a registered user, I can login with email + password so I access my session.
3. **US-3 Session persist:** As a user, my session persists on refresh (zustand persist) so I don't re-login every time.
4. **US-4 Logout:** As a logged-in user, I can logout so my token is cleared.
5. **US-5 Protected access:** As a logged-in user, I can fetch `/api/auth/me` and access protected routes; as a guest I am redirected to `/login`.

## 3. Scope

**In scope:**
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `User` Mongoose model + `protect` middleware + `asyncHandler` + `AppError` + centralized error handler
- Frontend `/login`, `/register`, `/dashboard` (placeholder private page), `ProtectedRoute`, `useAuthStore`, `authService`
- Validation, bcrypt hashing (rounds 12), JWT issuance/verification

**Out of scope (future features):**
- Refresh tokens / rotation, forgot-password / reset via email, OAuth (Google/GitHub), email verification, RBAC roles/admin, rate-limit brute-force (recommend but v2).

## 4. Backend Specification — `backend/`

### 4.1 File layout (MUST follow MVSC)

```
backend/src/
  config/db.js          # Singleton connectDB()
  models/User.js        # schema only + pre('save') hash hook
  services/authService.js # register, login, business logic, bcrypt, jwt sign
  controllers/authController.js # req/res only, calls service
  routes/authRoutes.js  # thin routers
  middlewares/auth.js   # protect
  middlewares/validate.js # validation-result handler
  middlewares/asyncHandler.js
  middlewares/errorHandler.js
  utils/AppError.js
  utils/generateToken.js
  app.js
  server.js
```

Flow (NON-NEGOTIABLE): `Route -> Controller -> Service -> Model`. Controllers never import `User` model directly.

### 4.2 Data Model — `models/User.js`

```js
{
  name: { type: String, required: [true, 'Name required'], trim: true, maxlength: 50 },
  email: { type: String, required: [true, 'Email required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, required: [true, 'Password required'], minlength: [8, 'Min 8 chars'], select: false },
  timestamps: true
}
indexes: { email: 1 } unique
toJSON transform: delete password, delete __v
pre('save'): if (!isModified('password')) return next(); salt = await bcrypt.genSalt(12); this.password = await bcrypt.hash(this.password, salt)
```

### 4.3 Services — `services/authService.js` (no req/res)

- `registerUser({ name, email, password })`:
  1. normalize email (lowercase, trim), check `User.findOne({ email })` → if exists throw `AppError('Email already registered', 409)`
  2. validate password length >= 8 (defense in depth, route already validated)
  3. `bcrypt.hash(password, 12)` OR rely on pre-save hook (pick ONE — recommended: hash in service, keep model hook as guard with isModified check; document choice, avoid double-hash)
  4. `User.create(...)`, sign JWT, return `{ user: toSafeUser(user), token }`
- `loginUser({ email, password })`:
  1. `User.findOne({ email }).select('+password')` → if !user throw `AppError('Invalid credentials', 401)` (generic, don't leak exists vs wrong pw)
  2. `await bcrypt.compare(password, user.password)` → if false same 401
  3. sign JWT, return `{ user: toSafeUser(user), token }`
- `getMe(userId)`: `User.findById(userId)` → if !user throw 404, return safe user
- `toSafeUser(user)`: `{ id: user._id, name, email, createdAt }` — never password
- `generateToken(id)`: `jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' })`

### 4.4 Controllers — `controllers/authController.js`

All wrapped in `asyncHandler`. Shape: `{ success: true, data: {...}, message: '...' }`
- `register(req, res)`: `const { user, token } = await authService.registerUser(req.body); res.status(201).json({ success:true, data:{ user, token }, message:'Registered' })`
- `login`: 200 + `{ user, token }`
- `logout`: 200 + `{}` — stateless JWT, client clears token; endpoint exists for symmetry/logging. Message: 'Logged out'
- `getMe`: `req.user.id` from protect → `authService.getMe` → 200

### 4.5 Routes — `routes/authRoutes.js`

```js
router.post('/register', registerValidator, validate, authController.register)
router.post('/login', loginValidator, validate, authController.login)
router.post('/logout', authController.logout)
router.get('/me', protect, authController.getMe)
mounted in app.js as app.use('/api/auth', authRoutes)
```

Validation (express-validator):
- register: `name.notEmpty().trim().isLength({max:50})`, `email.isEmail().normalizeEmail()`, `password.isLength({min:8}).withMessage('Min 8 chars')`
- login: `email.isEmail().normalizeEmail()`, `password.notEmpty()`

### 4.6 Middleware — `middlewares/auth.js (protect)`

1. Get `Authorization: Bearer <token>` → if missing throw 401 'Not authorized, no token'
2. `jwt.verify(token, JWT_SECRET)` → `User.findById(decoded.id)` → if !user 401
3. Attach `req.user = user`, `next()`. Handle `JsonWebTokenError` / `TokenExpiredError` → 401 'Not authorized, token failed'

### 4.7 Env

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/appdb
JWT_SECRET=<min 32 chars, never commit>
JWT_EXPIRE=7d
```
Backend boots only after Singleton `connectDB()` succeeds, else `process.exit(1)`.

## 5. Frontend Specification — `frontend/`

### 5.1 File layout

```
frontend/src/
  components/AuthForm.jsx   # reusable email/password form (Tailwind only)
  components/ProtectedRoute.jsx
  pages/Login.jsx
  pages/Register.jsx
  pages/Dashboard.jsx       # placeholder private page showing user.name/email + logout btn
  services/authService.js   # axios instance, baseURL = import.meta.env.VITE_API_URL
  store/useAuthStore.js     # zustand + persist
  utils/validators.js       # client-side email/length checks
```

### 5.2 Zustand store — `store/useAuthStore.js` (ONLY global state, no Context)

```js
create(persist((set) => ({
  user: null, token: null, isLoading: false, error: null,
  login: async (email, password) => { set({isLoading:true, error:null}); const {data} = await authService.login(...); set({user:data.data.user, token:data.data.token, isLoading:false}); },
  register: async (name, email, password) => {...same...},
  logout: async () => { await authService.logout(); set({user:null, token:null}); localStorage/persist cleared via persist },
  fetchMe: async () => {...GET /me with token...},
}), { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token }) }))
```

Rules: components never call axios directly, only `useAuthStore` actions or `authService`. Token injected via axios interceptor from store (`Authorization: Bearer`).

### 5.3 Pages & Routing

- `/login`: email + password, submit → `login()`, on success navigate `/dashboard`, on error show Tailwind alert. Link to `/register`.
- `/register`: name + email + password + confirm, client validate match + min 8, submit → `register()`.
- `/dashboard`: wrapped in `<ProtectedRoute>` → if `!token` redirect `/login`. Shows user info + Logout button.
- `ProtectedRoute.jsx`: `const token = useAuthStore(s=>s.token); return token ? <Outlet/> : <Navigate to="/login"/>`
- All styling Tailwind utility classes. No `style={{}}`, no extra CSS files. Loading spinner on `isLoading`, disabled button while pending.

### 5.4 Env

```
VITE_API_URL=http://localhost:5000/api
```

## 6. API Contract

| Method | Endpoint | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | /api/auth/register | public | `{name, email, password}` | 201 `{success:true, data:{user:{id,name,email,createdAt}, token}, message}` | 400 validation, 409 email exists |
| POST | /api/auth/login | public | `{email, password}` | 200 same shape | 400 validation, 401 invalid credentials |
| POST | /api/auth/logout | public | — | 200 `{success:true, data:{}, message}` | — |
| GET | /api/auth/me | Bearer | — | 200 `{success:true, data:{user}}` | 401 no/invalid token, 404 user gone |

All errors: `{ success:false, message, errors?:[] }` via centralized `errorHandler`.

## 7. Edge Cases

- Duplicate register (case variants `Test@x.com` vs `test@x.com`) → normalized, 409 generic 'Email already registered'
- Login wrong password / unknown email → identical 401 'Invalid credentials' (no enumeration)
- Missing/expired/malformed JWT on `/me` → 401, frontend clears store + redirects `/login`
- Password with leading/trailing spaces → trim? No — passwords must NOT be trimmed/altered; only email/name trimmed. Document.
- Double-hash regression → guarded by `isModified('password')` + single hash location test
- Network failure on login → zustand `error` set, form shows 'Server unreachable', `isLoading` reset
- Refresh persistence → rehydrate from persist, call `fetchMe()` on app boot to validate token still valid; if 401 auto-logout

## 8. Acceptance Criteria (MUST all pass)

- [ ] `POST /api/auth/register` with valid data → 201, returns user WITHOUT password + JWT verifiable with `JWT_SECRET`
- [ ] DB stores password as `$2b$12$...` hash, never plain; `password` never appears in ANY JSON response (check register, login, me)
- [ ] `POST /api/auth/login` correct → 200 + token; wrong password → 401 same message as unknown email
- [ ] `GET /api/auth/me` without token → 401; with valid token → 200 user; with tampered token → 401
- [ ] Frontend login/register forms validate (empty, bad email, <8 chars, confirm mismatch) before calling API
- [ ] Zustand `useAuthStore` is sole global auth state; no `AuthContext`, no Redux; refresh keeps session; logout clears and redirects
- [ ] `Route->Controller->Service->Model` respected — grep shows zero `mongoose/User` imports in controllers, zero `req/res` in services
- [ ] `npm run dev` works in both folders with only documented `.env` vars; lint clean; no `console.log` secrets

## 9. Test Plan (manual minimum for v1)

Backend (supertest or Thunder Client):
1. Register happy path → assert 201 + no password field
2. Register duplicate → 409
3. Login happy → 200 + token decodes
4. Login wrong pw → 401
5. GET /me no token → 401, with token → 200
6. Check MongoDB `users` doc: password starts with `$2b$`

Frontend:
1. Register → lands dashboard, refresh stays logged in
2. Logout → lands login, direct `/dashboard` redirects
3. Login with wrong pw → error alert, stays on page

## 10. Open Decisions

- Hash location: service vs model hook — pick one, document, add regression test for double-hash.
- Token storage: zustand persist (localStorage) for v1 simplicity; migrate to httpOnly cookie + refresh rotation in v2.
- Rate limiting (`express-rate-limit` on /login) + helmet/cors — recommended v1.1 hardening.
