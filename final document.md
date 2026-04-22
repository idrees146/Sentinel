# CSC337 — Advanced Web Technologies
## Midterm Lab — CLO4

**Semester:** Spring 2026
**Class:** BSE 6 A & B
**Submission Date:** April 22, 2026
**Maximum Marks:** 25

---

## Group Information

| # | Name | Role |
|---|------|------|
| 1 | **Muhammad Idrees** | Member A — Authentication, Catalog, Security Middleware, Documentation |
| 2 | **Hanan Sarwar** | Member B — Batches, Alerts, Validation Layer, Global Error Handling |

**GitHub Repository:** https://github.com/idrees146/Sentinel

---

## 1. Project Overview

**Sentinel — Medical Supply & Expiry Tracker** is a production-ready RESTful backend API that helps pharmacies, clinics, and hospital storerooms manage medical supplies at the **batch level**. Unlike a naive single-quantity stock system, Sentinel tracks every physical delivery as its own batch (with its own expiry date and remaining quantity), which enables three capabilities that matter for real medical inventory:

1. **Burn-rate awareness** — every consumption is recorded against a specific batch, so managers can see which items move fastest and set realistic reorder thresholds.
2. **Expiry prevention** — a dedicated alerts endpoint surfaces every active batch expiring within the next 30 days, ranked soonest-first, so nothing goes to waste silently.
3. **Audit-friendly access control** — every mutating action is gated by **JWT authentication** plus **role-based authorization** (Admin / Pharmacist / Nurse), giving a clear chain of accountability.

The API is built with Node.js, Express, MongoDB (Mongoose), and Zod, following a strict modular architecture that cleanly separates routes, controllers, models, middlewares, validators, and utilities. All error responses follow a single standardized JSON shape, input is sanitized against NoSQL injection, passwords are hashed with bcrypt, and stock deductions are **atomic** to prevent race conditions under concurrent use.

---

## 2. Work Division

The project was divided into two balanced halves of roughly equal complexity — each member owns a full vertical slice (model → controller → route → validator) plus shared platform concerns.

### Muhammad Idrees — Member A

| Area | Files |
|---|---|
| Server bootstrap & DB connection | `server.js`, `src/config/db.js` |
| Authentication module (register, login, JWT) | `src/models/User.js`, `src/controllers/authController.js`, `src/routes/authRoutes.js`, `src/validators/authValidators.js` |
| JWT utility (sign / verify) | `src/utils/jwt.js` |
| `verifyToken` middleware | `src/middlewares/verifyToken.js` |
| `requireRole` middleware (RBAC) | `src/middlewares/requireRole.js` |
| Catalog module (create master item, paginated list with search) | `src/models/CatalogItem.js`, `src/controllers/catalogController.js`, `src/routes/catalogRoutes.js`, `src/validators/catalogValidators.js` |
| Security middleware wiring (helmet, cors, rate limit, mongo-sanitize) | `src/app.js` |
| Project documentation | `README.md`, `.env.example`, `.gitignore`, `final document.md` |

**Summary:** Muhammad built the "who can do what" half of the system — everything that touches identity, permission, and the master list of items. He also wired the security and routing backbone in `app.js`.

### Hanan Sarwar — Member B

| Area | Files |
|---|---|
| Batch model with validators and indexes | `src/models/Batch.js` |
| Batch controller — receive delivery & atomic consume | `src/controllers/batchController.js` |
| Batch routes (RBAC-gated) | `src/routes/batchRoutes.js` |
| Batch Zod validators | `src/validators/batchValidators.js` |
| Alerts module (expiring within 30 days) | `src/controllers/alertController.js`, `src/routes/alertRoutes.js` |
| Global error handler (standardized JSON shape) | `src/middlewares/errorHandler.js` |
| `ApiError` class & `asyncHandler` wrapper | `src/utils/ApiError.js`, `src/utils/asyncHandler.js` |
| Zod `validate` middleware factory | `src/middlewares/validate.js` |
| Postman collection for API testing | `sentinel.postman_collection.json` |

**Summary:** Hanan built the "what's happening to the stock" half — tracking physical batches, deducting quantities safely under concurrency, and surfacing expiry alerts. He also owns the cross-cutting error-handling and validation infrastructure used by every module.

---

## 3. Architecture

### 3.1 Modular Folder Layout

```
project/
├── server.js                      # entry point — loads env, connects DB, starts server
├── src/
│   ├── app.js                     # Express app, middleware chain, routes, error handler
│   ├── config/db.js               # Mongoose connection
│   ├── models/                    # Mongoose schemas
│   │   ├── User.js
│   │   ├── CatalogItem.js
│   │   └── Batch.js
│   ├── controllers/               # request handlers (business logic)
│   │   ├── authController.js
│   │   ├── catalogController.js
│   │   ├── batchController.js
│   │   └── alertController.js
│   ├── routes/                    # Express routers
│   │   ├── authRoutes.js
│   │   ├── catalogRoutes.js
│   │   ├── batchRoutes.js
│   │   └── alertRoutes.js
│   ├── middlewares/
│   │   ├── verifyToken.js         # JWT verification, attaches req.user
│   │   ├── requireRole.js         # role-based access control
│   │   ├── validate.js            # Zod validator factory (body/params/query)
│   │   └── errorHandler.js        # global error handler
│   ├── validators/                # Zod schemas
│   │   ├── authValidators.js
│   │   ├── catalogValidators.js
│   │   └── batchValidators.js
│   └── utils/
│       ├── ApiError.js            # custom error class
│       ├── asyncHandler.js        # removes try/catch boilerplate
│       └── jwt.js                 # sign / verify helpers
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── sentinel.postman_collection.json
└── final document.md
```

### 3.2 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js** | Event loop is well-suited to I/O-heavy APIs |
| Framework | **Express 4** | Mature, minimal, middleware-based |
| Database | **MongoDB** via **Mongoose 8** | Document model fits the flexible batch schema; Mongoose gives typed schemas + validators |
| Auth | **jsonwebtoken** + **bcryptjs** | Industry-standard stateless JWT; bcrypt for password hashing |
| Validation | **Zod** + Mongoose validators | Zod rejects bad input at the HTTP boundary; Mongoose is the second defensive layer at DB write time |
| Config | **dotenv** | Keeps secrets out of the codebase |
| Security | **helmet**, **cors**, **express-mongo-sanitize**, **express-rate-limit** | Secure headers, CORS policy, NoSQL-injection protection, rate limiting |
| Logging | **morgan** (dev only) | Request logging for local debugging |
| Dev tooling | **nodemon** | Auto-reload on file changes |

---

## 4. Data Models

### 4.1 User
| Field | Type | Constraints |
|---|---|---|
| `name` | String | required, trim, 2–80 chars |
| `email` | String | required, unique, lowercase, email format |
| `password` | String | required, min 8 chars, **`select: false`** (never returned), auto-hashed with bcrypt in pre-save hook |
| `role` | String (enum) | `Admin` / `Pharmacist` / `Nurse`, default `Nurse` |
| `createdAt`, `updatedAt` | Date | via timestamps |

### 4.2 CatalogItem
| Field | Type | Constraints |
|---|---|---|
| `itemName` | String | required, trim, unique (case-insensitive collation), 2–120 chars |
| `category` | String | required, trim, max 60 chars |
| `minimumThreshold` | Number | required, min 0, default 0 |
| `createdAt`, `updatedAt` | Date | via timestamps |

### 4.3 Batch
| Field | Type | Constraints |
|---|---|---|
| `catalogItemId` | ObjectId (`ref: CatalogItem`) | required, indexed |
| `batchNumber` | String | required, trim |
| `quantityReceived` | Number | required, min 1 |
| `currentQuantity` | Number | required, min 0, **must be ≤ `quantityReceived`** |
| `expiryDate` | Date | required, must be in the future on creation |
| `status` | String (enum) | `Active` / `Quarantined`, default `Active` |
| `createdAt`, `updatedAt` | Date | via timestamps |

**Indexes:**
- `{ catalogItemId: 1, batchNumber: 1 }` — **unique compound index** (no duplicate batch number per item)
- `{ expiryDate: 1, status: 1 }` — supports the 30-day expiry query efficiently

---

## 5. REST API Specification

**Base URL:** `http://localhost:5000/api`
**Authentication:** `Authorization: Bearer <JWT>` on every protected route.

| # | Method | Endpoint | Auth | Roles Allowed | Purpose |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | Public | — | Register a new user (password hashed) |
| 2 | POST | `/api/auth/login` | Public | — | Authenticate, receive JWT |
| 3 | POST | `/api/catalog` | JWT | Admin, Pharmacist | Create a master catalog item |
| 4 | GET | `/api/catalog` | JWT | Any | List items (paginated, filterable) |
| 5 | POST | `/api/batches/receive` | JWT | Admin, Pharmacist | Log a new physical delivery |
| 6 | PATCH | `/api/batches/:id/consume` | JWT | Admin, Pharmacist, Nurse | Deduct stock atomically |
| 7 | GET | `/api/alerts/expiring` | JWT | Any | Active batches expiring in 30 days |
| 8 | GET | `/health` | Public | — | Server/uptime health check |

### 5.1 Request & Response Examples

#### `POST /api/auth/register`
Request:
```json
{ "name": "Ahmad Idrees", "email": "ahmad@example.com", "password": "secret123", "role": "Admin" }
```
Response (201):
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "Admin", "createdAt": "...", "updatedAt": "..." },
    "token": "eyJhbGciOi..."
  }
}
```

#### `POST /api/auth/login`
Request:
```json
{ "email": "ahmad@example.com", "password": "secret123" }
```
Response (200): same shape as register.

#### `POST /api/catalog`
Request (requires `Authorization: Bearer <TOKEN>`):
```json
{ "itemName": "Amoxicillin 500mg", "category": "Antibiotic", "minimumThreshold": 20 }
```
Response (201): the created item.

#### `GET /api/catalog?page=1&limit=10&search=amox&category=Antibiotic`
Response (200):
```json
{
  "success": true,
  "data": [ /* items */ ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

#### `POST /api/batches/receive`
Request:
```json
{
  "catalogItemId": "6620fa5b...",
  "batchNumber": "AMX-2026-04-A",
  "quantityReceived": 100,
  "expiryDate": "2026-05-15",
  "status": "Active"
}
```
Response (201): the new batch with `currentQuantity = 100`.

#### `PATCH /api/batches/:id/consume`
Request:
```json
{ "amount": 30 }
```
Response (200): the updated batch with `currentQuantity` reduced by the amount. Fails with **409 INSUFFICIENT_STOCK** if not enough stock, or **409 BATCH_NOT_ACTIVE** if the batch is quarantined.

#### `GET /api/alerts/expiring`
Response (200):
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "batchNumber": "AMX-2026-04-A",
      "expiryDate": "2026-05-15T00:00:00.000Z",
      "currentQuantity": 70,
      "status": "Active",
      "catalogItemId": { "_id": "...", "itemName": "Amoxicillin 500mg", "category": "Antibiotic" }
    }
  ],
  "meta": { "windowDays": 30, "evaluatedAt": "2026-04-22T...", "count": 1 }
}
```

---

## 6. Authentication & Authorization

### 6.1 JWT Flow
1. User hits `POST /api/auth/login` with credentials.
2. Server looks up the user, uses `bcrypt.compare(candidate, storedHash)` to verify.
3. On success, server signs a JWT with payload `{ sub: userId, email, role }` and `expiresIn` from env.
4. Client sends the token on every subsequent request as `Authorization: Bearer <token>`.
5. The `verifyToken` middleware reads the header, verifies the signature, and attaches `req.user = { id, email, role }`.
6. If a route needs a specific role, `requireRole(['Admin','Pharmacist'])` checks `req.user.role` and returns **403 FORBIDDEN** if not allowed.

### 6.2 RBAC Matrix

| Endpoint | Admin | Pharmacist | Nurse | Public |
|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/register` | | | | ✅ |
| `POST /api/auth/login` | | | | ✅ |
| `POST /api/catalog` | ✅ | ✅ | ❌ | |
| `GET /api/catalog` | ✅ | ✅ | ✅ | |
| `POST /api/batches/receive` | ✅ | ✅ | ❌ | |
| `PATCH /api/batches/:id/consume` | ✅ | ✅ | ✅ | |
| `GET /api/alerts/expiring` | ✅ | ✅ | ✅ | |

---

## 7. Validation & Sanitization

### 7.1 Two-Layer Validation
- **Zod** (at the HTTP boundary) — rejects malformed request bodies, params, and query strings *before* they ever touch the database. Returns `400 VALIDATION_ERROR` with a precise `details` array (field path + message).
- **Mongoose validators** (at the DB layer) — second defensive line; `enum`, `min`, `maxlength`, custom validators (e.g. `currentQuantity <= quantityReceived`).

### 7.2 Sanitization
- `express-mongo-sanitize` strips all keys containing `$` or `.` from `req.body`, `req.params`, and `req.query`. This prevents attacks like `{ "email": { "$gt": "" } }` bypassing the login query.
- `express.json({ limit: '10kb' })` caps request body size to prevent memory abuse.
- User-supplied `search` strings are regex-escaped before being used in `$regex` queries, preventing regex injection / ReDoS.

---

## 8. Error Handling

Every error response — from the deepest controller up to a malformed JSON body — flows through a single **global error handler** (`src/middlewares/errorHandler.js`) that returns this exact shape:

```json
{
  "success": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable explanation",
    "details": [ { "path": "password", "message": "Password must be at least 8 characters" } ]
  }
}
```

### 8.1 Error Code Table

| HTTP | `error.code` | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod or Mongoose validation failed |
| 400 | `INVALID_ID` | Malformed MongoDB ObjectId in URL |
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 401 | `UNAUTHORIZED` | Missing or malformed `Authorization` header |
| 401 | `INVALID_TOKEN` | JWT signature invalid or expired |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password on login |
| 403 | `FORBIDDEN` | User's role is not allowed for this action |
| 404 | `NOT_FOUND` | Route doesn't exist |
| 404 | `CATALOG_NOT_FOUND` / `BATCH_NOT_FOUND` | Referenced resource missing |
| 409 | `EMAIL_TAKEN` | Registering with an already-used email |
| 409 | `DUPLICATE_KEY` | Unique-index violation (e.g. duplicate batchNumber for same item) |
| 409 | `BATCH_NOT_ACTIVE` | Consume called on a Quarantined batch |
| 409 | `INSUFFICIENT_STOCK` | Requested amount > currentQuantity |
| 429 | `RATE_LIMITED` | Too many auth attempts in 15-minute window |
| 500 | `INTERNAL_ERROR` | Unhandled server error (logged server-side) |

### 8.2 How it works

- Controllers never write error responses directly. They throw `new ApiError(statusCode, code, message, details)`.
- The `asyncHandler` wrapper forwards rejected promises to `next(err)`, eliminating every `try/catch` block from the controllers.
- The error handler in `src/middlewares/errorHandler.js` translates each error type — `ApiError`, `ZodError`, `mongoose.Error.ValidationError`, `mongoose.Error.CastError`, MongoDB duplicate-key error (code `11000`), `JsonWebTokenError`, `TokenExpiredError`, JSON-parse errors — into the standardized response shape. Anything unrecognized is logged and surfaced as `500 INTERNAL_ERROR` with a generic message (so implementation details never leak).

---

## 9. Security Features Summary

| Concern | Mitigation |
|---|---|
| Passwords stored in plaintext | `bcryptjs` with 10 salt rounds + `select: false` on the field |
| JWT tampering | HMAC-signed tokens verified on every protected route |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from request keys |
| HTTP security headers | `helmet` sets defaults (CSP, X-Frame-Options, X-Content-Type-Options, etc.) |
| CORS abuse | `cors` middleware restricts origins |
| Brute-force login | `express-rate-limit` — 20 req / 15 min on `/api/auth/*` |
| Denial-of-service via large bodies | 10 KB JSON body cap |
| Race condition on stock deduction | `findOneAndUpdate` with `currentQuantity: { $gte: amount }` filter — atomic, no read-then-write window |
| Information leak on errors | Generic `INTERNAL_ERROR` for unhandled exceptions; stack traces never sent to client |
| Regex injection / ReDoS on search | User input is regex-escaped before being used in `$regex` |

---

## 10. How to Run Locally

```bash
git clone https://github.com/idrees146/Sentinel.git
cd Sentinel
npm install
cp .env.example .env       # then edit JWT_SECRET and MONGO_URI
npm run dev                # nodemon — auto-reloads on file change
# or: npm start            # plain node
```

Once running, `GET http://localhost:5000/health` returns `{ "status": "ok", "uptime": ... }`.

### Required Environment Variables (`.env`)

| Variable | Example |
|---|---|
| `PORT` | `5000` |
| `NODE_ENV` | `development` |
| `MONGO_URI` | `mongodb+srv://<user>:<pass>@cluster.xxxx.mongodb.net/sentinel` |
| `JWT_SECRET` | *(long random string, required)* |
| `JWT_EXPIRES_IN` | `7d` |
| `BCRYPT_SALT_ROUNDS` | `10` |

---

## 11. API Testing Evidence (Postman Screenshots)

Screenshots of every endpoint being tested through Postman follow below. Each screenshot shows the full request (method, URL, headers, body) and the corresponding response (status code, body). Both happy-path scenarios and failure cases are included to demonstrate the robustness of validation, authentication, authorization, and error handling.

### Test Order

| # | Test | Expected Status |
|---|---|---|
| 1 | Health check | 200 OK |
| 2 | Register — Admin | 201 Created |
| 3 | Register — Nurse | 201 Created |
| 4 | Login — Admin | 200 OK (token returned) |
| 5 | Create Catalog Item | 201 Created |
| 6 | List Catalog (paginated + search) | 200 OK |
| 7 | Receive Batch | 201 Created |
| 8 | Consume Batch — happy path | 200 OK |
| 9 | Consume Batch — insufficient stock | **409 Conflict** |
| 10 | Expiring Alerts (30-day window) | 200 OK |
| 11 | Missing token on protected route | **401 Unauthorized** |
| 12 | Validation error (bad register body) | **400 Bad Request** |
| 13 | Role forbidden (Nurse → POST /catalog) | **403 Forbidden** |
| 14 | Invalid ObjectId in path | **400 Bad Request** |
| 15 | Duplicate email on register | **409 Conflict** |

---

### Screenshot 1 — Health Check

*[Paste screenshot here]*

---

### Screenshot 2 — Register (Admin)

*[Paste screenshot here]*

---

### Screenshot 3 — Register (Nurse)

*[Paste screenshot here]*

---

### Screenshot 4 — Login (Admin)

*[Paste screenshot here]*

---

### Screenshot 5 — Create Catalog Item

*[Paste screenshot here]*

---

### Screenshot 6 — List Catalog (paginated + search)

*[Paste screenshot here]*

---

### Screenshot 7 — Receive Batch

*[Paste screenshot here]*

---

### Screenshot 8 — Consume Batch (happy path)

*[Paste screenshot here]*

---

### Screenshot 9 — Consume Batch (409 INSUFFICIENT_STOCK)

*[Paste screenshot here]*

---

### Screenshot 10 — Expiring Alerts (30-day window)

*[Paste screenshot here]*

---

### Screenshot 11 — Missing Token (401 UNAUTHORIZED)

*[Paste screenshot here]*

---

### Screenshot 12 — Validation Error (400 VALIDATION_ERROR)

*[Paste screenshot here]*

---

### Screenshot 13 — Role Forbidden (403 FORBIDDEN)

*[Paste screenshot here]*

---

### Screenshot 14 — Invalid ObjectId (400)

*[Paste screenshot here]*

---

### Screenshot 15 — Duplicate Email (409 EMAIL_TAKEN)

*[Paste screenshot here]*

---

## 12. Conclusion

The Sentinel API satisfies every requirement of the CSC337 Midterm Lab specification:

- ✅ **Modular structure** — routes / controllers / models / middlewares / validators / utils are cleanly separated.
- ✅ **`dotenv`, proper HTTP status codes, middleware functions** — all present and correctly used.
- ✅ **Proper RESTful endpoints per module** — Auth, Catalog, Batches, Alerts — each with appropriate verbs and resource URIs.
- ✅ **Authentication & Authorization** — JWT-based auth with role-based access control via a reusable `requireRole` middleware.
- ✅ **Robust error handling** — single global error handler producing a standardized JSON shape, with 15+ distinct error codes and automatic translation of Zod, Mongoose, MongoDB, JWT, and JSON-parse errors.
- ✅ **Data sanitization & validation** — Zod at the HTTP boundary, Mongoose at the DB layer, `express-mongo-sanitize` for NoSQL-injection protection, regex escaping for search, referencing via ObjectId between Batch and CatalogItem.

The codebase is committed to the GitHub repository linked above and runs out of the box with `npm install && npm run dev`. Full Postman test evidence is attached in Section 11.

— **Muhammad Idrees** & **Hanan Sarwar**
BSE 6 — Spring 2026
