# Sentinel — Medical Supply & Expiry Tracker (REST API)

Production-ready Node.js + Express + MongoDB backend that tracks medical supplies at the **batch level**, deducts stock safely, and surfaces alerts for batches expiring within the next 30 days. Built for CSC337 (Advanced Web Technologies) — BSE 6 A&B.

**Repository:** https://github.com/idrees146/Sentinel.git

---

## Project Overview

Sentinel helps a pharmacy/clinic answer three everyday questions:

1. *What items do we stock, and what's the reorder threshold?* — the **Catalog**.
2. *Which physical batch should we consume from, and how much is left?* — the **Batches / Inventory** module with atomic stock deduction.
3. *What's expiring soon?* — the **Alerts** module (next 30 days of active stock).

All actions are gated by JWT authentication with three roles — **Admin**, **Pharmacist**, **Nurse** — each with different permissions.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Database | MongoDB (Mongoose 8) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Validation | `zod` + Mongoose schema validation |
| Config | `dotenv` |
| Security | `helmet`, `cors`, `express-mongo-sanitize`, `express-rate-limit` |
| Logging | `morgan` (dev only) |

---

## Project Structure

```
project/
├── server.js                 Entry — loads env, connects DB, starts server
├── src/
│   ├── app.js                Express app, middleware chain, routes, error handler
│   ├── config/db.js          Mongoose connect
│   ├── models/               Mongoose schemas (User, CatalogItem, Batch)
│   ├── controllers/          Request handlers (business logic)
│   ├── routes/               Express routers per module
│   ├── middlewares/          verifyToken, requireRole, validate, errorHandler
│   ├── validators/           Zod schemas for body/params/query
│   └── utils/                ApiError, asyncHandler, jwt helpers
├── .env.example
├── .gitignore
├── package.json
└── sentinel.postman_collection.json
```

---

## Quick Start

```bash
git clone https://github.com/idrees146/Sentinel.git
cd Sentinel
npm install
cp .env.example .env     # then edit JWT_SECRET, MONGO_URI
npm start                # or: npm run dev (nodemon)
```

Verify: `GET http://localhost:5000/health` → `{ "status": "ok", "uptime": ... }`

### Environment variables (`.env`)

| Var | Example | Notes |
|---|---|---|
| `PORT` | `5000` | |
| `NODE_ENV` | `development` | |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/sentinel` | Or MongoDB Atlas URI |
| `JWT_SECRET` | *long random string* | **Required** — change from default |
| `JWT_EXPIRES_IN` | `7d` | |
| `BCRYPT_SALT_ROUNDS` | `10` | |

---

## API Reference

Base URL: `http://localhost:5000/api`
Auth: send `Authorization: Bearer <token>` on every protected route.

### 1. Auth

#### `POST /api/auth/register` — public
```json
{ "name": "Ahmad Idrees", "email": "ahmad@example.com", "password": "secret123", "role": "Admin" }
```
`role` is optional (defaults to `Nurse`). Returns `201` with `{ user, token }`.

#### `POST /api/auth/login` — public
```json
{ "email": "ahmad@example.com", "password": "secret123" }
```
Returns `200` with `{ user, token }`.

### 2. Catalog

#### `POST /api/catalog` — Admin, Pharmacist
```json
{ "itemName": "Amoxicillin 500mg", "category": "Antibiotic", "minimumThreshold": 20 }
```
Returns `201` with the new item.

#### `GET /api/catalog` — any authenticated user
Query params: `page` (default 1), `limit` (default 20, max 100), `category`, `search` (partial match on `itemName`).
Returns `200` with `{ data: [...], meta: { page, limit, total, totalPages } }`.

### 3. Batches

#### `POST /api/batches/receive` — Admin, Pharmacist
```json
{
  "catalogItemId": "6620fa5b...",
  "batchNumber": "AMX-2026-04-A",
  "quantityReceived": 100,
  "expiryDate": "2026-06-15",
  "status": "Active"
}
```
`currentQuantity` auto-initialises to `quantityReceived`. `expiryDate` must be in the future. Returns `201`.

#### `PATCH /api/batches/:id/consume` — Admin, Pharmacist, Nurse
```json
{ "amount": 30 }
```
Atomically deducts `amount` from `currentQuantity` **only if** enough stock is available and the batch is `Active`. Returns `200` with the updated batch, or:
- `404 BATCH_NOT_FOUND`
- `409 BATCH_NOT_ACTIVE`
- `409 INSUFFICIENT_STOCK`

### 4. Alerts

#### `GET /api/alerts/expiring` — any authenticated user
Returns all `Active` batches whose `expiryDate` falls between now and 30 days from now, sorted soonest-first, with the catalog item populated:
```json
{
  "success": true,
  "data": [ { "_id": "...", "batchNumber": "...", "expiryDate": "...", "currentQuantity": 70, "catalogItemId": { "itemName": "Amoxicillin 500mg", ... } } ],
  "meta": { "windowDays": 30, "evaluatedAt": "2026-04-22T...", "count": 1 }
}
```

---

## Standardized Error Response

Every non-2xx response has this exact shape:

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

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod or Mongoose validation failed (details array included) |
| 400 | `INVALID_ID` | Malformed Mongo ObjectId in path |
| 400 | `INVALID_JSON` | Body was not valid JSON |
| 401 | `UNAUTHORIZED` | Missing/malformed `Authorization` header |
| 401 | `INVALID_TOKEN` | JWT invalid or expired |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password on login |
| 403 | `FORBIDDEN` | Role is not permitted for this action |
| 404 | `NOT_FOUND` | Route not found |
| 404 | `CATALOG_NOT_FOUND` / `BATCH_NOT_FOUND` | Referenced resource missing |
| 409 | `EMAIL_TAKEN` | Email already registered |
| 409 | `DUPLICATE_KEY` | Unique index violation (e.g. duplicate batchNumber) |
| 409 | `BATCH_NOT_ACTIVE` | Cannot consume from a Quarantined batch |
| 409 | `INSUFFICIENT_STOCK` | Not enough stock for the requested amount |
| 429 | `RATE_LIMITED` | Too many requests on auth endpoints |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

---

## Security & Sanitization

- **Password hashing** — `bcryptjs` with 10 salt rounds, `select: false` so passwords never leak in responses.
- **JWT** — signed with `JWT_SECRET`, 7-day expiry by default, verified on every protected route.
- **Role-based access control** — `requireRole(['Admin','Pharmacist'])` factory middleware.
- **NoSQL injection** — `express-mongo-sanitize` strips `$` and `.` from all request keys.
- **Header hardening** — `helmet` sets secure HTTP headers.
- **Rate limiting** — 300 req/15min globally; 20 req/15min on `/api/auth/*`.
- **Payload cap** — JSON body limit set to 10 KB.
- **Regex safety** — `search` query on catalog is regex-escaped before being used.
- **Atomic stock** — `consume` uses `findOneAndUpdate` with `currentQuantity: { $gte: amount }` as filter — no read-then-write race.

---

## Viva Cheatsheet

**How does authentication flow work?**
Client sends credentials to `/api/auth/login` → server verifies with `bcrypt.compare` → signs a JWT with `sub`, `email`, `role` → client sends it as `Authorization: Bearer <token>` → `verifyToken` middleware verifies the signature and attaches `req.user` → `requireRole` middleware checks the role against the route's allowlist.

**Why `findOneAndUpdate` for consume?**
Doing `find` then `save` has a race window: two concurrent requests can both read `currentQuantity: 10`, both deduct 8, and leave `-6`. `findOneAndUpdate({ _id, currentQuantity: { $gte: amount } }, { $inc: { currentQuantity: -amount } })` is a single atomic MongoDB operation — if the filter doesn't match, nothing is written and we surface `INSUFFICIENT_STOCK`.

**Why Zod + Mongoose validation both?**
Zod rejects bad input at the HTTP boundary before any DB call — fast feedback, exact field paths in the error. Mongoose validators are a second defensive layer so the DB can never hold invalid data even if a caller bypasses the Zod layer.

**How is the expiry alert computed?**
`Batch.find({ status: 'Active', expiryDate: { $gte: now, $lte: now + 30d } })` — indexed on `{ expiryDate: 1, status: 1 }` so it's efficient even at scale.

**How is the error shape kept consistent?**
All controllers throw `ApiError(statusCode, code, message, details?)`. The global error handler (`src/middlewares/errorHandler.js`) is the **only** place that writes error responses, and it also translates Zod, Mongoose, duplicate-key, and JWT errors into the same shape.

---

## Group Work Division (suggested)

| Member | Responsibilities |
|---|---|
| Member A | Auth module, Catalog module, JWT utils, role middleware, README |
| Member B | Batches module, Alerts module, error handler, Zod validators, Postman collection |

(Update this table with your real names/roll numbers before submission.)

---

## License

ISC — for educational use.
