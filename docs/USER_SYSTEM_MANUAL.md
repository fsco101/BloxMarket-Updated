**User System Manual**

This document explains how the BloxMarket system works, describes major features and components, and provides instructions to run and troubleshoot the codebase. It targets developers and power users who want to understand the platform or run it locally.

**Overview**:
- **What it is:** BloxMarket is a full-stack Roblox trading and marketplace platform. It includes a React + TypeScript frontend and a Node.js + Express backend using MongoDB (Mongoose). Real-time features are provided via Socket.io. Admin panels use server-side DataTables endpoints.
- **Main folders:** `backend/`, `frontend/`, `docs/`, `uploads/` (contains images and user files).

**Architecture**:
- **Frontend:** `frontend/` — React 19 + TypeScript + Vite. Key files:
  - `frontend/src/App.tsx` — main app and providers
  - `frontend/src/services/api.ts` — centralized API service and auth handling
  - `frontend/src/components/` — UI components; landing components live in `frontend/src/components/landing/`
- **Backend:** `backend/` — Node.js + Express + Mongoose. Key files:
  - `backend/server.js` — server bootstrap
  - `backend/routes/` — API routes grouped by feature (e.g., `auth.js`, `trades.js`, `users.js`, `datatables/`)
  - `backend/controllers/` — business logic per feature (e.g., `tradeController.js`, `userController.js`)
  - `backend/models/` — Mongoose schemas (e.g., `User.js`, `Trade.js`, `Chat.js`)
  - `backend/middleware/auth.js` — JWT verification and penalty checks
  - `backend/services/firebaseService.js`, `backend/services/emailService.js` — external utilities

**Authentication & Token Handling**:
- Authentication uses JWT tokens. The frontend stores the JWT in `localStorage` or `sessionStorage` as `bloxmarket-token` and sends it in the `Authorization: Bearer <token>` header.
- `backend/middleware/auth.js` validates tokens and checks user status (suspended, banned, or penalty flags). Protected routes use this middleware.
- The frontend `apiService` automatically attaches the token and handles 401/refresh flows.

**Main Functionalities**:
- User accounts and profiles (register/login, avatars in `uploads/avatars/`).
- Trading posts and listings: create, update, delete trades, images uploaded to `uploads/trades/`.
- Forums & posts: content in `uploads/forum/` for attachments.
- Messaging: real-time chat via Socket.io, message persistence in `Message.js` model.
- Middleman verification and vouches: `MiddlemanVouch.js`, `MiddlemanApplication.js` models + admin review controllers.
- Notifications & reports: user notifications and report endpoints (`notificationController.js`, `reportController.js`).
- Admin dashboard: server-side DataTables endpoints under `backend/routes/datatables/` and controllers in `backend/controllers/datatables/`.

**API Patterns**:
- Standard response format used across endpoints: `{ data: ..., message?: ..., error?: ... }`.
- DataTables endpoints return server-side pagination responses: `{ data: items, recordsTotal, recordsFiltered, draw }`.
- File uploads: use `multipart/form-data` with `multer` and stored under `backend/uploads/{section}/`.

**Real-time (Socket.io)**:
- Socket.io is used for messaging, presence, typing indicators, and live notifications. Typical flow:
  - Client connects: `socketService.connect()`
  - Join room: `socketService.joinChat(chatId)`
  - Send/receive: `socket.on('message', handler)` and `socket.emit('message', data)`

**File upload locations (backend/upload directories)**:
- `uploads/avatars/`
- `uploads/chat/`
- `uploads/documents/` (verification documents)
- `uploads/event/`
- `uploads/forum/`
- `uploads/middlemanface/`
- `uploads/trades/`
- `uploads/wishlists/`

**Environment & .env examples** (create `.env` inside `backend/`):
```
MONGODB_URI=mongodb://localhost:27017/bloxmarket
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Run locally (PowerShell commands)**:
- Start MongoDB (Windows Service):
```powershell
# If MongoDB installed as service
net start MongoDB
```
- Backend (from repo root):
```powershell
cd backend; npm install; npm run dev
```
- Frontend (separate terminal):
```powershell
cd frontend; npm install; npm run dev
```

Notes: `npm run dev` for backend assumes a dev script exists (commonly `nodemon server.js` or `nodemon ./server.js`). Check `backend/package.json` for exact scripts.

**How to use key features (developer notes)**:
- Authentication: Use `POST /api/auth/register` and `POST /api/auth/login`. After login, the token is returned and the frontend stores it.
- Trades: endpoints typically at `GET /api/trades`, `POST /api/trades` (with images), `GET /api/trades/:id`.
- Uploads: endpoints under `backend/routes/uploads.js` and handled with `multer`; ensure upload folder permissions exist.
- DataTables admin endpoints: `/api/admin/datatables/{resource}` — used by admin UIs for server-side pagination, sorting and filtering.

**How to Use the System — Step-by-step**
Below are concise end-user workflows and developer-facing API examples for common tasks.

- Register / Login (End user):
  1. Open the site and click `Join` / `Create Account`.
  2. Fill in username, email, password and submit `POST /api/auth/register`.
  3. After email verification (if enabled), sign in via `POST /api/auth/login`.
  4. The frontend stores the returned JWT as `bloxmarket-token` and navigates to the dashboard.

- Update Profile / Avatar:
  1. Go to `Profile` → `Edit Profile`.
  2. Update display name, bio, and optionally upload an avatar image (multipart form to `/api/uploads/avatars`).
  3. Save — the frontend will `PUT /api/users/:id` with form data and refresh user cache.

- Create a Trade (Listing an item):
  1. Dashboard → `Create Trade`.
  2. Fill title, description, item details, price (optional) and upload item images (multipart to `/api/trades` or `/api/uploads/trades`).
  3. Submit — frontend calls `POST /api/trades` with `Authorization` header.
  4. Trade appears in marketplace after server validation and image processing.

- Search and Filter Trades:
  1. Use the marketplace search bar or filters (price, category, tags).
  2. Frontend queries `GET /api/trades?search=...&page=1&limit=20&sort=...`.
  3. Click a trade to view details and contact the seller.

- Request a Trade / Use Middleman:
  1. On a trade page, click `Request` or `Chat` to message the seller.
  2. If either party requests middleman service, follow the middleman flow which uses verified middlemen only.
  3. Middleman vouching and requests are handled via `POST /api/middleman-requests` and `POST /api/middleman-vouches`.

- Messaging (Real-time chat):
  1. Open `Messenger` or a trade chat window.
  2. Socket.io connects automatically. Messages are emitted via `socket.emit('message', { chatId, text, attachments })`.
  3. Messages are persisted to the database by the backend (`Message` model) and broadcast to room participants.

- Create a Forum Post / Comment:
  1. Forum → `New Post` → fill title, body, attach images (optional).
  2. Submit via `POST /api/forum` (multipart form if attachments present).
  3. Comments use `POST /api/forum/:id/comments`.

- Wishlist & Vouching:
  1. Add items to your wishlist via UI; frontend calls `POST /api/wishlist`.
  2. After successful trades, users may vouch via `POST /api/vouches` to improve credibility.

- Notifications:
  1. Notifications appear in the UI; the frontend polls `/api/notifications` every 30s or receives them via Socket.io.
  2. Mark read: `POST /api/notifications/:id/read`.

- Admin tasks (Admin user):
  1. Log in to an admin account. Access the admin dashboard.
  2. Use DataTables admin pages to search/filter users, reports, trades and perform bulk actions.
  3. Admin endpoints are protected; use admin tokens and role checks via `middleware/auth.js`.

- File uploads best-practices:
  - Use structured `FormData` keys matching backend `multer` fields (e.g., `images[]`, `avatar`).
  - Keep uploads under 5MB per file (backend `multer` limits apply).
  - Validate content types client-side before upload (image/* for images).

**API Examples (curl)**
- Login (returns token):
```
curl -X POST "http://localhost:5000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"you@example.com","password":"password"}'
```
- Create trade with images (example using `curl` multipart):
```
curl -X POST "http://localhost:5000/api/trades" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "title=My Rare Hat" \
  -F "description=Detailed description" \
  -F "images=@/path/to/image1.png" \
  -F "images=@/path/to/image2.jpg"
```

These steps and examples cover the most common user flows. If you want, I can expand any flow into UI screenshots, a step-by-step video script, or a Postman collection.

**Admin workflows**:
- Admin pages use DataTables with server-side processing. The server-side controllers live under `backend/controllers/datatables/` (e.g., `userDatatableController.js`).
- Bulk operations and CSV exports are supported via admin endpoints.

**UI notes (frontend)**:
- UI components are organized under `frontend/src/components/ui/` and should be reused across pages for consistent styling.
- Landing and marketing components are in `frontend/src/components/landing/` (e.g., `HeroSection.tsx`, `FeaturesSection.tsx`, `CTASection.tsx`). These use custom text animation helpers in `frontend/src/components/ui/text-animations`.

**Troubleshooting**:
- CORS errors: ensure `FRONTEND_URL` in backend `.env` matches the frontend dev URL. Check CORS setup in `backend/server.js` or an express middleware.
- MongoDB: ensure `MONGODB_URI` is correct and MongoDB service is running. Use MongoDB Compass or `mongo` shell to verify.
- Uploads permission issues: create the `backend/uploads/` folders and give node process write permissions.
- JWT / 401s: check `JWT_SECRET` and token expiry. The frontend `apiService` responds to 401 by attempting token verification or prompting login.
- Socket.io: verify server logs for connection events; ensure the client connects to the same origin or the correct socket URL (check frontend `socketService`).

**Developer tips**:
- When adding a new feature follow the pattern:
  1. Add Mongoose model in `backend/models/`.
  2. Add controller in `backend/controllers/`.
  3. Add route in `backend/routes/` and protect with `middleware/auth.js` if necessary.
  4. Add frontend API wrapper in `frontend/src/services/api.ts` and a component in `frontend/src/components/`.
  5. Add admin DataTable controller under `backend/controllers/datatables/` if the feature needs admin listing.
- Use `apiService` (frontend) for centralized request handling (token, retries, deduplication).

**Where to look for code**:
- Models: `backend/models/`
- Controllers: `backend/controllers/`
- Routes: `backend/routes/`
- Frontend components: `frontend/src/components/`
- Frontend services and utilities: `frontend/src/services/`, `frontend/src/lib/`

**Next steps & maintenance**:
- Keep `.env` secrets out of source control.
- Add tests for critical controllers and API flows.
- Consider adding a health-check endpoint `GET /api/health` and automated scripts to seed dev data.

If you'd like, I can:
- Add a short `README` in `backend/` with the minimal `.env` and run instructions.
- Generate sample Postman / Insomnia collection for major API endpoints.

---
File created: `docs/USER_SYSTEM_MANUAL.md`
