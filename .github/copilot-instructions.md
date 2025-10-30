# BloxMarket V2 - AI Agent Instructions# BloxMarket V2 - AI Agent Instructions



## Project Overview## Project Overview



BloxMarket is a full-stack platform for Roblox trading with these key components:BloxMarket is a full-stack platform for Roblox trading with these key components:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Shadcn/UI + Socket.io client- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Shadcn/UI

- **Backend**: Node.js + Express + MongoDB (via Mongoose) + Socket.io server- **Backend**: Node.js + Express + MongoDB (via Mongoose)

- **Authentication**: JWT-based with token management, role-based access control, and penalty system- **Authentication**: JWT-based with token management and role-based access control

- **Real-time Features**: WebSocket messaging, live notifications, typing indicators- **Admin Dashboard**: Complete admin management interface with DataTables integration

- **Admin Dashboard**: Complete admin management interface with DataTables integration

## Architecture & Data Flow

## Architecture & Data Flow

### Frontend Structure

### Frontend Structure- `/frontend/src/components/` - React components organized by feature

- `/frontend/src/components/` - React components organized by feature (TradingHub, Forums, Messenger, etc.)- `/frontend/src/services/api.ts` - Centralized API service with authentication handling

- `/frontend/src/services/api.ts` - Centralized API service with advanced request handling- `/frontend/src/App.tsx` - Main application component with auth context provider

- `/frontend/src/contexts/` - React contexts for global state (Auth, Theme, GlobalLoading)

- `/frontend/src/App.tsx` - Main application with routing and error boundaries### Backend Structure

- `/backend/models/` - Mongoose schemas (User.js, Trade.js, Forum.js, etc.)

### Backend Structure- `/backend/controllers/` - Business logic separated by feature

- `/backend/models/` - Mongoose schemas with complex relationships and validation- `/backend/routes/` - API endpoint definitions

- `/backend/controllers/` - Business logic with consistent error handling patterns- `/backend/middleware/auth.js` - JWT authentication middleware

- `/backend/routes/` - API endpoints with authentication middleware- `/backend/controllers/datatables/` - DataTables-specific controllers for admin panel

- `/backend/middleware/auth.js` - JWT authentication with penalty/suspension handling

- `/backend/controllers/datatables/` - Server-side DataTables controllers for admin panel### Authentication Flow

- `/backend/services/` - Email service and other utilities1. User registers/logs in via `/api/auth/register` or `/api/auth/login`

2. Server generates JWT token stored in `localStorage` as `bloxmarket-token`

### Authentication Flow3. Token included in Authorization header: `Bearer <token>`

1. User registers/logs in via `/api/auth/register` or `/api/auth/login`4. Protected routes use `auth.js` middleware to verify token

2. Server generates JWT token stored in `localStorage`/`sessionStorage` as `bloxmarket-token`5. Token verification includes checks for token validity, user existence, and account status

3. Token included in Authorization header: `Bearer <token>`

4. Protected routes use `auth.js` middleware to verify token and check user status### Data Models

5. Token verification includes checks for validity, user existence, account status, and active penalties- **User**: Profile info, auth data, role management (user, admin, moderator, etc.)

6. Automatic token refresh and session expiration handling- **Trade**: Trading listings with item details, status, and images

- **Forum**: Community posts and comments

### Real-time Communication- **Event**: Platform events and giveaways

- Socket.io integration for instant messaging and live updates- **Wishlist**: User-created wishlists for desired items

- Typing indicators, message read receipts, group chat management- **Report**: User-submitted reports for moderation

- Live notification polling with 30-second intervals- **Vouch**: User reputation system

- Connection handling with automatic reconnection

## Development Workflows

### Data Models

- **User**: Profile info, auth data, role management, credibility scoring, penalty system### Setup Environment

- **Trade**: Trading listings with images, status tracking, comments, votes```bash

- **Forum**: Community posts with voting, comments, categories# Clone and install dependencies

- **Event**: Platform events/giveaways with participant managementcd c:\BloxMarketV2

- **Wishlist**: User-created wishlists with priority levels and imagescd backend && npm install

- **Report**: Moderation system for content reporting and penalty managementcd ../frontend && npm install

- **Vouch**: Reputation system for trades and middleman verification

- **Chat/Message**: Real-time messaging with file/image support# Configure environment

- **Notification**: User notifications with read/unread status# Create .env file in /backend with:

MONGODB_URI=mongodb://localhost:27017/bloxmarket

## Development WorkflowsJWT_SECRET=your_jwt_secret_key_here

PORT=5000

### Setup EnvironmentNODE_ENV=development

```bashFRONTEND_URL=http://localhost:5173

# Clone and install dependencies

cd c:\BloxMarketV2# Start MongoDB service (Windows)

cd backend && npm installnet start MongoDB

cd ../frontend && npm install

# Start application

# Configure environment# Terminal 1 (backend):

# Create .env file in /backend with:cd backend && npm run dev

MONGODB_URI=mongodb://localhost:27017/bloxmarket# Terminal 2 (frontend):

JWT_SECRET=your_jwt_secret_key_herecd frontend && npm run dev

PORT=5000```

NODE_ENV=development

FRONTEND_URL=http://localhost:5173### Database

- Local MongoDB at `mongodb://localhost:27017/bloxmarket`

# Start MongoDB service (Windows)- Use MongoDB Compass for GUI database management

net start MongoDB- Collections automatically created from Mongoose models



# Start application### API Pattern

# Terminal 1 (backend):All API endpoints follow RESTful conventions with:

cd backend && npm run dev- JWT authentication via Authorization header

# Terminal 2 (frontend):- Standard response format: `{ data/message, error? }`

cd frontend && npm run dev- Comprehensive error handling with meaningful status codes

```- DataTables-specific endpoints for admin panel at `/api/admin/datatables/{resource}`



### Database## Code Patterns & Conventions

- Local MongoDB at `mongodb://localhost:27017/bloxmarket`

- Use MongoDB Compass for GUI database management### Frontend Patterns

- Collections auto-created from Mongoose models1. **API Service**: All requests use the `apiService` from `services/api.ts`

- Complex relationships with population and aggregation pipelines```typescript

// Example API call

### API Patternconst data = await apiService.getTrades({ page: 1, limit: 10 });

All API endpoints follow RESTful conventions with:```

- JWT authentication via Authorization header

- Standard response format: `{ data/message, error? }`2. **Authentication**: Auth state from context provider

- Comprehensive error handling with meaningful status codes```typescript

- DataTables-specific endpoints for admin panel at `/api/admin/datatables/{resource}`const { isLoggedIn, currentUser } = useAuth();

- File upload endpoints using multipart/form-data```



## Code Patterns & Conventions3. **UI Components**: Use Shadcn/UI component library for consistent design

```typescript

### Frontend Patternsimport { Button } from './ui/button';

1. **API Service**: All requests use the `apiService` from `services/api.ts` with advanced features:import { Dialog, DialogContent } from './ui/dialog';

```typescript```

// Request deduplication for GET requests

private pendingRequests = new Map<string, Promise<any>>();**Available UI Components** (`/frontend/src/components/ui/`):

- **Layout**: `accordion`, `aspect-ratio`, `resizable`, `scroll-area`, `separator`, `sidebar`, `universal-layout`

// Client-side throttling by endpoint category- **Forms**: `button`, `checkbox`, `form`, `input`, `input-otp`, `label`, `radio-group`, `select`, `slider`, `switch`, `textarea`, `toggle`, `toggle-group`

private getRequestCategory(endpoint: string): 'auth' | 'standard' | 'heavy'- **Data Display**: `avatar`, `badge`, `calendar`, `card`, `chart`, `table`, `progress`

- **Feedback**: `alert`, `alert-dialog`, `skeleton`, `sonner`, `toast`

// Rate limit handling with exponential backoff- **Overlay**: `dialog`, `drawer`, `hover-card`, `popover`, `sheet`, `tooltip`

return await handleRateLimit(endpoint, makeRequest, requestCategory);- **Navigation**: `breadcrumb`, `menubar`, `navigation-menu`, `pagination`, `tabs`

```- **Utilities**: `command`, `context-menu`, `dropdown-menu`, `collapsible`, `carousel`

- **Hooks**: `use-mobile`, `use-toast`, `utils`

2. **Authentication**: Auth state from context provider with penalty handling:

```typescript**Design Consistency**: Always import from `./ui/` folder for standardized components with consistent styling, accessibility, and behavior.

const { isLoggedIn, currentUser } = useAuth();

// Check for active penalties/suspensions in middleware4. **State Management**: React hooks with proper loading/error states

``````typescript

const [data, setData] = useState([]);

3. **UI Components**: Use Shadcn/UI component library for consistent design:const [loading, setLoading] = useState(true);

```typescriptconst [error, setError] = useState('');

import { Button } from './ui/button';```

import { Dialog, DialogContent } from './ui/dialog';

// Available components: accordion, avatar, badge, card, dialog, dropdown-menu, etc.### Backend Patterns

```1. **Controller Structure**: Export object with CRUD methods

```javascript

4. **State Management**: Multiple context providers for different concerns:export const authController = {

```typescript  register: async (req, res) => { /* ... */ },

// Global loading state with request tracking  login: async (req, res) => { /* ... */ }

const { loadingState, showLoader, hideLoader } = useGlobalLoading();

export const tradeController = {

// Theme management  getAllTrades: async (req, res) => { /* ... */ },

const { isDark, toggleTheme } = useTheme();  createTrade: async (req, res) => { /* ... */ }

};

// Auth state with user data```

const { user: currentUser, login, logout } = useAuth();

```2. **Route Definition**: Modular routes with authentication middleware

```javascript

5. **Modal Systems**: Complex modal hierarchies with proper z-index management:router.post('/', auth, controller.create);

```typescriptrouter.get('/', controller.getAll);

// Profile modals, image viewers, confirmation dialogsrouter.get('/:id', controller.getById);

// Nested modals with proper backdrop handling```

```

3. **Error Handling**: Consistent try-catch pattern

6. **File Upload**: Complex multipart handling with preview and validation:```javascript

```typescripttry {

// FormData construction for images/documents  // Operation logic

const formData = new FormData();  res.status(200).json({ data });

images.forEach(image => formData.append('images', image));} catch (error) {

  console.error('Error:', error);

// Progress tracking and error handling  res.status(500).json({ error: 'Descriptive error message' });

```}

```

### Backend Patterns

1. **Controller Structure**: Export object with CRUD methods and consistent error handling:4. **Validation**: Request validation before processing

```javascript```javascript

export const tradeController = {if (!req.body.requiredField) {

  getAllTrades: async (req, res) => {  return res.status(400).json({ error: 'Required field missing' });

    try {}

      const trades = await Trade.find().populate('user_id', 'username');```

      res.status(200).json({ data: trades });

    } catch (error) {### Advanced API Service Patterns

      console.error('Error fetching trades:', error);

      res.status(500).json({ error: 'Failed to fetch trades' });The `apiService` in `frontend/src/services/api.ts` implements sophisticated request handling:

    }

  }**Request Deduplication**: GET requests are deduplicated to prevent duplicate API calls

};```typescript

```// Store pending requests to prevent duplicates

private pendingRequests = new Map<string, Promise<any>>();

2. **Route Definition**: Modular routes with authentication and validation middleware:```

```javascript

router.post('/', auth, upload.array('images'), controller.create);**Client-Side Throttling**: Automatic request spacing based on endpoint categories

router.get('/', controller.getAll);```typescript

router.get('/:id', controller.getById);private getRequestCategory(endpoint: string): 'auth' | 'standard' | 'heavy'

```const { throttled, waitTime } = shouldThrottle(endpoint, requestCategory);

```

3. **Authentication Middleware**: Complex auth with penalty checking:

```javascript**Rate Limit Handling**: Exponential backoff with automatic retries

// Check token validity, user existence, role permissions```typescript

// Handle suspensions, bans, and temporary penaltiesreturn await handleRateLimit(endpoint, makeRequest, requestCategory);

// Automatic token cleanup for expired sessions```

```

**Token Management**: Automatic token verification and session expiration handling

4. **DataTables Integration**: Server-side processing for admin panels:```typescript

```javascriptif (response.status === 401) {

// Pagination, sorting, filtering, search  // Complex token validation logic with silent verification

// Bulk operations and CSV export}

// Consistent response format for DataTables library```

```

### Image Handling

5. **File Upload Handling**: Multer middleware with validation:- Upload images to `/backend/uploads/{section}/`

```javascript- Images accessed via `/uploads/{section}/{filename}`

const upload = multer({- FormData used for multipart/form-data uploads

  dest: 'uploads/trades/',- Image processing with Sharp/Jimp for resizing and optimization

  fileFilter: (req, file, cb) => { /* validation */ },

  limits: { fileSize: 5 * 1024 * 1024 }### Rate Limiting

});- **Standard API**: 1000 requests per 15 minutes

```- **Authentication**: 100 requests per 15 minutes

- **Admin/Sensitive**: 50 requests per hour

### Advanced API Service Patterns- **DataTables**: 200 requests per 5 minutes

- Client-side throttling prevents hitting limits

The `apiService` implements enterprise-level request handling:

### DataTables Integration

**Request Deduplication**: GET requests deduplicated to prevent duplicate API calls:- Admin panels use server-side pagination, sorting, filtering

```typescript- Endpoints: `/api/admin/datatables/{resource}`

if (isGetRequest && requestKey && this.pendingRequests.has(requestKey)) {- Support for CSV export and bulk operations

  return this.pendingRequests.get(requestKey);- Controllers in `/backend/controllers/datatables/`

}

```## Common Workflows



**Client-Side Throttling**: Automatic request spacing based on endpoint categories:### Adding a New Feature

```typescript1. Define Mongoose model in `/backend/models/`

const { throttled, waitTime } = shouldThrottle(endpoint, requestCategory);2. Create controller in `/backend/controllers/`

if (throttled) await new Promise(resolve => setTimeout(resolve, waitTime));3. Define routes in `/backend/routes/`

```4. Implement frontend API methods in `api.ts`

5. Create React component in `/frontend/src/components/`

**Rate Limit Handling**: Exponential backoff with automatic retries:6. Add admin DataTable controller in `/backend/controllers/datatables/` if needed

```typescript

return await handleRateLimit(endpoint, makeRequest, requestCategory);### Authentication Flow

```- JWT token stored in localStorage as `bloxmarket-token`

- `apiService` automatically includes token in requests

**Token Management**: Automatic token verification and session expiration:- Protected routes check user roles in middleware

```typescript- Token expiration handled with automatic logout

if (response.status === 401) {

  const ok = await this.verifyTokenSilently(currentToken);### Permission Checking

  if (!ok) window.dispatchEvent(new CustomEvent('auth-expired'));```typescript

}// Frontend permission pattern

```const canEditItem = (item) => {

  if (!currentUser) return false;

**Global Loading Management**: Request tracking with loading indicators:  const isOwner = currentUser.id === item.user_id;

```typescript  const isAdmin = currentUser.role === 'admin';

globalLoadingManager.showLoader(requestId, loadingMessage);  return isOwner || isAdmin;

// Automatic cleanup on completion/error};

``````



### Real-time Features### CRUD Operations

**Socket.io Integration**: WebSocket connections for live messaging:All features follow consistent CRUD patterns:

```javascript- **Create**: Form validation, image upload handling

// Client-side socket management- **Read**: Pagination, filtering, population of related data

socketService.startTyping(chat.chat_id);- **Update**: Ownership/permission checks, partial updates

socketService.sendMessage(messageData);- **Delete**: Cascade deletion, file cleanup



// Server-side room management and broadcasting### Notification System

io.to(chatId).emit('message', messageData);- Automatic notifications for user interactions

```- Types: trade_comment, trade_upvote, forum_reply, etc.

- Real-time updates via polling

**Notification System**: Polling-based live updates:

```typescript## Troubleshooting

useEffect(() => {

  const interval = setInterval(() => {### Common Issues

    apiService.getNotifications({ unreadOnly: true });- **Authentication errors**: Check token validity and expiration

  }, 30000);- **CORS issues**: Verify FRONTEND_URL in .env matches your frontend URL

  return () => clearInterval(interval);- **MongoDB connection**: Ensure MongoDB is running locally or connection string is correct

}, []);- **Image upload issues**: Check directory permissions and FormData structure

```

### Debugging Tips

### Image & File Handling- Check browser console for frontend errors

- Upload to `/backend/uploads/{section}/` (trades, forum, events, avatars, etc.)- Server logs contain detailed backend errors

- Images accessed via `/uploads/{section}/{filename}` with absolute URLs- Use API health check endpoint: `GET /api/health`

- FormData for multipart uploads with Sharp/Jimp processing- JWT validation issues often appear in auth.js middleware logs

- Image validation, resizing, and format conversion

- File type detection and security scanning## Project-Specific Conventions



### Rate Limiting & Security### Naming

- **Standard API**: 1000 requests per 15 minutes- File naming: PascalCase for components, camelCase for other files

- **Authentication**: 100 requests per 15 minutes- Variable naming: camelCase for variables, PascalCase for components/interfaces

- **Admin/Sensitive**: 50 requests per hour- Database fields: snake_case in MongoDB documents

- **DataTables**: 200 requests per 5 minutes

- Client-side throttling prevents hitting server limits### API Response Format

- Helmet.js security headers and CORS configuration- Success responses include relevant data or success message

- Error responses include `error` field with descriptive message

### DataTables Integration- Pagination responses include `pagination` object with `page`, `limit`, `total`, `pages`

- Admin panels use server-side processing with jQuery DataTables

- Endpoints: `/api/admin/datatables/{resource}`### Component Structure

- Support for CSV export and bulk operations- Functional components with hooks

- Search and filter functionality across all columns- useState for local state

- Consistent response format for jQuery DataTables- useEffect for side effects and data fetching

- Proper loading/error states for async operations

## Common Workflows

### DataTable Integration

### Adding a New Feature- Admin pages use server-side pagination, sorting, and filtering

1. Define Mongoose model in `/backend/models/` with proper validation and relationships- DataTable endpoints follow pattern: `/api/admin/datatables/{resource}`

2. Create controller in `/backend/controllers/` with CRUD operations- Export functionality for CSV data export

3. Define routes in `/backend/routes/` with authentication middleware- Bulk operations (delete, moderate) supported through dedicated endpoints

4. Add API methods to `frontend/src/services/api.ts` with proper error handling

5. Create React component in `/frontend/src/components/` with loading/error states### CRUD Implementations

6. Add admin DataTable controller in `/backend/controllers/datatables/` if neededAll major features (Trading, Forums, Events, Wishlists) follow consistent CRUD patterns with:

7. Update navigation and routing in `App.tsx`- Create operations with form validation

- Read operations with filtering, searching and pagination

### Authentication Flow- Update operations with permission checking

- JWT token stored in localStorage/sessionStorage as `bloxmarket-token`- Delete operations with confirmation

- `apiService` automatically includes token in requests

- Protected routes check user roles and penalty status in middleware### Image Upload Pattern

- Token expiration handled with automatic logout and session cleanup```typescript

- Penalty system blocks access for suspended/banned users// Frontend: FormData for image uploads

const formData = new FormData();

### Permission CheckingformData.append('title', postData.title);

```typescriptimages.forEach(image => formData.append('images', image));

// Frontend permission pattern

const canEditItem = (item) => {// Backend: Multer middleware handles uploads

  if (!currentUser) return false;const upload = multer({ dest: 'uploads/forum/' });

  const isOwner = currentUser.id === item.user_id;router.post('/', auth, upload.array('images'), controller.create);

  const isAdmin = currentUser.role === 'admin';```

  const hasActivePenalty = currentUser.penalties?.some(p => p.is_active);

  return isOwner || isAdmin && !hasActivePenalty;### Vouching System

};- Trade vouches: Users can vouch for successful trades

```- Middleman vouches: Rating system for verified middlemen

- Credibility scores calculated from vouch history

### CRUD Operations

All features follow consistent CRUD patterns:### Advanced Features

- **Create**: Form validation, file upload handling, relationship management

- **Read**: Pagination, filtering, population of related data, permission checks**Real-time Updates**: Polling-based notification system for live updates

- **Update**: Ownership verification, partial updates, image replacement logic```typescript

- **Delete**: Cascade deletion, file cleanup, permission validation// Frontend polling pattern

useEffect(() => {

### Real-time Messaging  const interval = setInterval(() => {

- Socket.io rooms for chat management    apiService.getNotifications({ unreadOnly: true });

- Message persistence with MongoDB  }, 30000); // Poll every 30 seconds

- File/image uploads in chat with preview  return () => clearInterval(interval);

- Typing indicators and read receipts}, []);

- Group chat creation and member management```



### Notification System**Bulk Operations**: Admin DataTables support bulk actions

- Automatic notifications for user interactions (comments, votes, vouches)```typescript

- Types: trade_comment, trade_upvote, forum_reply, etc.// Bulk delete pattern

- Real-time polling with 30-second intervalsasync bulkDeleteEvents(eventIds: string[]) {

- Read/unread status tracking and bulk operations  return await this.request('/admin/datatables/events/bulk/delete', {

    method: 'POST',

## Troubleshooting    body: JSON.stringify({ eventIds })

  });

### Common Issues}

- **Authentication errors**: Check token validity, expiration, and penalty status```

- **CORS issues**: Verify FRONTEND_URL matches your frontend URL exactly

- **MongoDB connection**: Ensure MongoDB is running and connection string is correct**Export Functionality**: CSV export for admin data

- **Image upload issues**: Check directory permissions, file size limits, and FormData structure```typescript

- **Socket connection issues**: Verify Socket.io server configuration and client connection// CSV export pattern

- **Rate limiting**: Check client-side throttling and server rate limit configurationasync exportEventsCSV(status?: string, type?: string) {

  const response = await fetch(`${API_BASE_URL}/admin/datatables/events/export/csv`, {

### Debugging Tips    headers: { 'Authorization': `Bearer ${this.token}` }

- Check browser console for frontend errors and network requests  });

- Server logs contain detailed backend errors with stack traces  const blob = await response.blob();

- Use API health check endpoint: `GET /api/health`  // Download logic...

- JWT validation issues appear in auth.js middleware logs}

- Socket.io debugging: Check server logs for connection events
- MongoDB queries: Use `.explain()` for performance analysis

## Project-Specific Conventions

### Naming
- File naming: PascalCase for React components, camelCase for utilities
- Variable naming: camelCase for variables, PascalCase for components/interfaces
- Database fields: snake_case in MongoDB documents (user_id, created_at)
- API endpoints: RESTful with plural nouns (/api/trades, /api/users)

### API Response Format
- Success responses: `{ data: result }` or `{ message: "Success" }`
- Error responses: `{ error: "Descriptive message" }`
- Pagination: `{ data: items, pagination: { page, limit, total, pages } }`
- DataTables: `{ data: items, recordsTotal, recordsFiltered, draw }`

### Component Structure
- Functional components with hooks (useState, useEffect, useContext)
- Proper loading/error states for all async operations
- Consistent prop interfaces with TypeScript
- Error boundaries for component-level error handling

### DataTable Integration
- Admin pages use server-side processing with jQuery DataTables
- DataTable endpoints follow pattern: `/api/admin/datatables/{resource}`
- Export functionality for CSV data export with proper headers
- Bulk operations (delete, moderate) through dedicated endpoints
- Search and filter state persistence

### CRUD Implementations
All major features (Trading, Forums, Events, Wishlists, Messaging) follow consistent patterns:
- Create operations with form validation and file upload
- Read operations with filtering, searching, and pagination
- Update operations with permission checking and partial updates
- Delete operations with confirmation and cascade cleanup

### Image Upload Pattern
```typescript
// Frontend: FormData construction
const formData = new FormData();
formData.append('title', postData.title);
images.forEach(image => formData.append('images', image));

// Backend: Multer middleware with validation
const upload = multer({
  dest: 'uploads/forum/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  }
});
```

### Vouching System
- Trade vouches: Users can vouch for successful trade completions
- Middleman vouches: Rating system (1-5 stars) for verified middlemen
- Credibility scores calculated from vouch history and ratings
- Vouch visibility affects user reputation and platform trust

### Advanced Features

**Real-time Updates**: Polling-based notification system for live updates:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    apiService.getNotifications({ unreadOnly: true });
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**Bulk Operations**: Admin DataTables support bulk actions:
```typescript
async bulkDeleteEvents(eventIds: string[]) {
  return await this.request('/admin/datatables/events/bulk/delete', {
    method: 'POST',
    body: JSON.stringify({ eventIds })
  });
}
```

**Export Functionality**: CSV export for admin data:
```typescript
async exportEventsCSV(status?: string, type?: string) {
  const response = await fetch(`${API_BASE_URL}/admin/datatables/events/export/csv`, {
    headers: { 'Authorization': `Bearer ${this.token}` }
  });
  const blob = await response.blob();
  // Download logic with proper filename
}
```

**Modal Management**: Complex modal hierarchies with proper state management:
```typescript
// Multiple modals can be open simultaneously
// Proper z-index stacking and backdrop handling
// Context preservation across modal navigation
```

**File Upload with Preview**: Advanced file handling with drag-and-drop:
```typescript
// Image preview before upload
// File validation (size, type, count)
// Progress indicators and error handling
// Support for multiple file types (images, documents)
```

### Socket.io Patterns
**Client-side Connection**:
```typescript
// Connection management with auto-reconnect
socketService.connect();
socketService.joinChat(chatId);

// Event listeners for real-time updates
socket.on('message', handleNewMessage);
socket.on('typing', handleTypingIndicator);
```

**Server-side Room Management**:
```javascript
// Room-based message broadcasting
io.to(chatId).emit('message', messageData);

// User presence tracking
socket.join(`chat_${chatId}`);
socket.to(`chat_${chatId}`).emit('user_joined', userData);
```

This codebase represents a sophisticated full-stack application with enterprise-level features including real-time communication, advanced API handling, comprehensive admin functionality, and complex state management. Understanding these patterns is crucial for effective development and maintenance.