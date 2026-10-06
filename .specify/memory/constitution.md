# Project Constitution

Version: 1.1.0 | Ratified: 2026-10-06 | Last Amended: 2026-10-06

## 1. Project Stack & Monorepo Layout

Two separate folders at repo root. No mixing frontend/backend code.

```
/frontend/  -> React + Tailwind CSS (Vite)
/backend/   -> Node.js + Express.js
```

- `frontend/` owns all UI. Never directly imports from `backend/`, never talks to MongoDB directly. Only communicates via backend REST API (`/api/*`).
- `backend/` owns all business logic, auth, and DB access. Never serves React components, only JSON.
- Shared contract: REST + JSON. API shapes defined in backend, consumed in frontend via typed service layer (`frontend/src/services/`).

## 2. Frontend Principles — React + Tailwind

- React 18+ with functional components + hooks only. No class components.
- Vite for build/dev. React Router for routing.
- Tailwind CSS for ALL styling. No plain CSS files except `index.css` with Tailwind directives. No inline `style={{}}` unless dynamic value requires it. No other UI frameworks (no Bootstrap, no MUI).
- Structure inside `frontend/src/`:
  ```
  components/  # reusable UI (Button, Input, Card)
  pages/       # route views
  hooks/       # custom hooks
  services/    # api clients (axios/fetch wrappers)
  store/       # zustand stores ONLY (useAuthStore, useThemeStore)
  utils/       # formatters, validators
  ```
- Clean code: one component per file, PascalCase files, small components (<150 lines). Props typed with PropTypes or TypeScript. All API calls isolated in `services/`, never `fetch` inside components directly.
- State management: zustand ONLY for global/client state. No React Context for global state, no Redux, no MobX.
  - Local `useState` first for component-local UI.
  - `store/` holds one slice per domain: e.g. `useAuthStore.js` (user, token, login/logout actions), `useAppStore.js` (theme, loading).
  - Stores use vanilla zustand `create()` + `persist` middleware only for auth where needed. No prop-drilling, no Context providers wrapping App for state.

## 3. Backend Principles — Node.js + Express + MVSC + Clean Code

Architecture is MVSC = Models + Views (React frontend) + Services + Controllers. On backend this enforces MVC + Service layer. Strict separation:

```
backend/src/
  config/      # env, db.js, constants
  models/      # Mongoose schemas ONLY, no logic
  controllers/ # req/res ONLY, no business logic, no DB queries
  services/    # business logic (auth, user, hashing)
  routes/      # Express routers, thin, map to controllers
  middlewares/ # auth, errorHandler, validate, asyncHandler
  utils/       # AppError, logger, helpers
  app.js       # express setup
  server.js    # listen entrypoint only
```

Rules (NON-NEGOTIABLE):
- Controllers never call Mongoose models directly. Flow: `Route -> Controller -> Service -> Model`.
- Services never touch `req`/`res`. They take plain data, return data or throw `AppError`.
- Routes contain no logic, only `router.post('/', validate, controller.create)`.
- Clean code: async/await only (no callback hell, no `.then` chains in new code), centralized error middleware, consistent response shape `{ success, data, message }`, ESLint + Prettier required, env vars via `dotenv`, never hardcode secrets/URIs.
- Validation on every input (express-validator or Joi/Zod). Passwords never logged, never returned in responses (`select: false`).

## 4. Database Principles — MongoDB + Mongoose + Singleton

- MongoDB only. Mongoose as sole ODM. No native driver queries, no second ORM.
- Connection MUST use Singleton pattern. Single source: `backend/src/config/db.js`:
  - One shared instance, cached connection, `connectDB()` returns same promise on repeat calls.
  - Handles `connected`, `error`, `disconnected` events. App exits on initial connect failure.
  - Connection options: `maxPoolSize`, timeouts set explicitly.
- Models: one file per model in `models/`, schema with timestamps, indexes for queried fields, `toJSON` transform to strip `password`, `__v`.
- No business logic in models except Mongoose hooks/methods directly tied to data integrity (e.g., `pre('save')` for hashing).

## 5. Auth & Password Security — bcrypt (NON-NEGOTIABLE)

- Password hashing with `bcrypt` (or `bcryptjs`) ONLY. No MD5, SHA1, plain SHA256, no custom crypto.
- Rules:
  - Salt rounds: 12 (minimum 10, maximum 14).
  - Hash ONLY in service layer or Mongoose `pre('save')` hook with `isModified('password')` guard to avoid double-hashing.
  - Compare with `bcrypt.compare(plain, hash)` only. Never decrypt, never store plain.
  - Schema: `password: { type: String, required: true, minlength: 8, select: false }`.
  - Login service MUST do `.select('+password')` explicitly, then compare, then omit password from returned user.
  - Enforce password policy: min 8 chars. Recommend letters + numbers.
  - Auth uses JWT (access token) in `Authorization: Bearer`, stored on frontend in zustand `useAuthStore` (with `persist` middleware), NOT in raw Context/localStorage access scattered in components. Middleware `protect` verifies JWT.

Example flow:
```
register: validate -> check exists -> bcrypt.hash(pw, 12) in service -> save -> return user without password + token
login: find +password -> bcrypt.compare -> token
```

## 6. Quality Gates

- Backend must start with `npm run dev` with only `MONGO_URI`, `JWT_SECRET`, `PORT` in `.env`.
- Frontend must start with `npm run dev` with only `VITE_API_URL` in `.env`.
- Before merge: backend routes tested manually (or supertest), no password leak in any JSON response, `console.log` removed, lint clean.
- No `any`/unhandled promise rejections. All async controllers wrapped in `asyncHandler`.

## 7. Forbidden

- No SQLite/Postgres/MySQL, no Prisma/TypeORM/Sequelize.
- No password in plain text, no `crypto.createHash` for passwords.
- No new Mongoose connection per request/file.
- No business logic in controllers/routes, no `req/res` in services.
- No Tailwind bypass with heavy custom CSS, no direct DB access from frontend.
- No React Context / Redux for global state — use zustand `store/` only.
