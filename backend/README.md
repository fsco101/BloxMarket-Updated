# BloxMarket Backend

This is the backend service for BloxMarket, providing API endpoints for the frontend application.

## Environment Setup

Create a `.env` file in the root of the backend directory with the following variables:

```bash
MONGODB_URI=mongodb://localhost:27017/bloxmarket
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## API Rate Limiting

The BloxMarket API implements rate limiting to protect the system from abuse and ensure fair usage. Different endpoints have different rate limits:

### Rate Limit Categories

1. **Standard API Endpoints**: 500 requests per 15 minutes
   - Applies to most API endpoints
   - Used for regular browsing, viewing content, and standard operations

2. **Authentication Endpoints**: 50 requests per 15 minutes
   - Applies to `/api/auth/*` routes
   - Login, registration, token verification, etc.

3. **Admin & Sensitive Operations**: 10 requests per hour
   - Applies to `/api/admin/*` and `/api/verification/*` routes
   - Includes account verification, admin operations, and other sensitive actions

4. **DataTable Endpoints**: 50 requests per 5 minutes
   - Applies to `/api/admin/datatables/*` routes
   - Used for admin dashboards and data-intensive operations

### Rate Limit Responses

When a rate limit is exceeded, the API will respond with:

- HTTP Status: `429 Too Many Requests`
- JSON Response:
  ```json
  {
    "error": "Too many requests, please try again later.",
    "retryAfter": 900,
    "retryAfterMinutes": 15
  }
  ```
- Headers:
  - `Retry-After`: Number of seconds to wait before retrying
  - `RateLimit-Limit`: Maximum number of requests allowed in the window
  - `RateLimit-Remaining`: Number of requests remaining in the window
  - `RateLimit-Reset`: Time when the rate limit window resets (in seconds)

### Client-Side Throttling

To help prevent hitting rate limits, the frontend implements client-side throttling which automatically spaces out API requests.

## API Routes

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get authentication token
- `GET /api/auth/me` - Get current user information
- `POST /api/auth/logout` - Logout user

### Trades

- `GET /api/trades` - Get all trades
- `POST /api/trades` - Create a new trade
- `GET /api/trades/:id` - Get trade by ID
- `PATCH /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade

### Forum

- `GET /api/forum/posts` - Get all forum posts
- `POST /api/forum/posts` - Create a new forum post
- `GET /api/forum/posts/:id` - Get forum post by ID
- `PUT /api/forum/posts/:id` - Update forum post
- `DELETE /api/forum/posts/:id` - Delete forum post

### Events

- `GET /api/events` - Get all events
- `POST /api/events` - Create a new event
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Users

- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/avatar` - Upload user avatar

### Wishlists

- `GET /api/wishlists` - Get all wishlists
- `POST /api/wishlists` - Create a new wishlist
- `GET /api/wishlists/:id` - Get wishlist by ID
- `PUT /api/wishlists/:id` - Update wishlist
- `DELETE /api/wishlists/:id` - Delete wishlist

### Admin

- `GET /api/admin/stats` - Get admin dashboard statistics
- `GET /api/admin/users` - Get all users (with filtering)
- `PATCH /api/admin/users/:id/role` - Update user role
- `PATCH /api/admin/users/:id/ban` - Ban or unban user
- `PATCH /api/admin/users/:id/status` - Activate or deactivate user

### Admin DataTables

- `/api/admin/datatables/users` - User management
- `/api/admin/datatables/events` - Events management
- `/api/admin/datatables/forum` - Forum management
- `/api/admin/datatables/trading-posts` - Trading post management
- `/api/admin/datatables/wishlists` - Wishlist management
