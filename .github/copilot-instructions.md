# BloxMarket V2 - AI Agent Instructions

## Project Overview

BloxMarket is a full-stack platform for Roblox trading with these key components:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Shadcn/UI
- **Backend**: Node.js + Express + MongoDB (via Mongoose)
- **Authentication**: JWT-based with token management and role-based access control
- **Admin Dashboard**: Complete admin management interface with DataTables integration

## Architecture & Data Flow

### Frontend Structure
- `/frontend/src/components/` - React components organized by feature
- `/frontend/src/services/api.ts` - Centralized API service with authentication handling
- `/frontend/src/App.tsx` - Main application component with auth context provider

### Backend Structure
- `/backend/models/` - Mongoose schemas (User.js, Trade.js, Forum.js, etc.)
- `/backend/controllers/` - Business logic separated by feature
- `/backend/routes/` - API endpoint definitions
- `/backend/middleware/auth.js` - JWT authentication middleware
- `/backend/controllers/datatables/` - DataTables-specific controllers for admin panel

### Authentication Flow
1. User registers/logs in via `/api/auth/register` or `/api/auth/login`
2. Server generates JWT token stored in `localStorage` as `bloxmarket-token`
3. Token included in Authorization header: `Bearer <token>`
4. Protected routes use `auth.js` middleware to verify token
5. Token verification includes checks for token validity, user existence, and account status

### Data Models
- **User**: Profile info, auth data, role management (user, admin, moderator, etc.)
- **Trade**: Trading listings with item details, status, and images
- **Forum**: Community posts and comments
- **Event**: Platform events and giveaways
- **Wishlist**: User-created wishlists for desired items
- **Report**: User-submitted reports for moderation
- **Vouch**: User reputation system

## Development Workflows

### Setup Environment
```bash
# Clone and install dependencies
cd c:\BloxMarketV2
cd backend && npm install
cd ../frontend && npm install

# Configure environment
# Create .env file in /backend with:
MONGODB_URI=mongodb://localhost:27017/bloxmarket
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Start MongoDB service (Windows)
net start MongoDB

# Start application
# Terminal 1 (backend):
cd backend && npm run dev
# Terminal 2 (frontend):
cd frontend && npm run dev
```

### Database
- Local MongoDB at `mongodb://localhost:27017/bloxmarket`
- Use MongoDB Compass for GUI database management
- Collections automatically created from Mongoose models

### API Pattern
All API endpoints follow RESTful conventions with:
- JWT authentication via Authorization header
- Standard response format: `{ data/message, error? }`
- Comprehensive error handling with meaningful status codes
- DataTables-specific endpoints for admin panel at `/api/admin/datatables/{resource}`

## Code Patterns & Conventions

### Frontend Patterns
1. **API Service**: All requests use the `apiService` from `services/api.ts`
```typescript
// Example API call
const data = await apiService.getTrades({ page: 1, limit: 10 });
```

2. **Authentication**: Auth state from context provider
```typescript
const { isLoggedIn, currentUser } = useAuth();
```

3. **UI Components**: Use Shadcn/UI component library
```typescript
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
```

4. **State Management**: React hooks with proper loading/error states
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
```

### Backend Patterns
1. **Controller Structure**: Export object with CRUD methods
```javascript
export const authController = {
  register: async (req, res) => { /* ... */ },
  login: async (req, res) => { /* ... */ }

export const tradeController = {
  getAllTrades: async (req, res) => { /* ... */ },
  createTrade: async (req, res) => { /* ... */ }
};
```

2. **Route Definition**: Modular routes with authentication middleware
```javascript
router.post('/', auth, controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
```

3. **Error Handling**: Consistent try-catch pattern
```javascript
try {
  // Operation logic
  res.status(200).json({ data });
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ error: 'Descriptive error message' });
}
```

4. **Validation**: Request validation before processing
```javascript
if (!req.body.requiredField) {
  return res.status(400).json({ error: 'Required field missing' });
}
```

### Advanced API Service Patterns

The `apiService` in `frontend/src/services/api.ts` implements sophisticated request handling:

**Request Deduplication**: GET requests are deduplicated to prevent duplicate API calls
```typescript
// Store pending requests to prevent duplicates
private pendingRequests = new Map<string, Promise<any>>();
```

**Client-Side Throttling**: Automatic request spacing based on endpoint categories
```typescript
private getRequestCategory(endpoint: string): 'auth' | 'standard' | 'heavy'
const { throttled, waitTime } = shouldThrottle(endpoint, requestCategory);
```

**Rate Limit Handling**: Exponential backoff with automatic retries
```typescript
return await handleRateLimit(endpoint, makeRequest, requestCategory);
```

**Token Management**: Automatic token verification and session expiration handling
```typescript
if (response.status === 401) {
  // Complex token validation logic with silent verification
}
```

### Image Handling
- Upload images to `/backend/uploads/{section}/`
- Images accessed via `/uploads/{section}/{filename}`
- FormData used for multipart/form-data uploads
- Image processing with Sharp/Jimp for resizing and optimization

### Rate Limiting
- **Standard API**: 1000 requests per 15 minutes
- **Authentication**: 100 requests per 15 minutes
- **Admin/Sensitive**: 50 requests per hour
- **DataTables**: 200 requests per 5 minutes
- Client-side throttling prevents hitting limits

### DataTables Integration
- Admin panels use server-side pagination, sorting, filtering
- Endpoints: `/api/admin/datatables/{resource}`
- Support for CSV export and bulk operations
- Controllers in `/backend/controllers/datatables/`

## Common Workflows

### Adding a New Feature
1. Define Mongoose model in `/backend/models/`
2. Create controller in `/backend/controllers/`
3. Define routes in `/backend/routes/`
4. Implement frontend API methods in `api.ts`
5. Create React component in `/frontend/src/components/`
6. Add admin DataTable controller in `/backend/controllers/datatables/` if needed

### Authentication Flow
- JWT token stored in localStorage as `bloxmarket-token`
- `apiService` automatically includes token in requests
- Protected routes check user roles in middleware
- Token expiration handled with automatic logout

### Permission Checking
```typescript
// Frontend permission pattern
const canEditItem = (item) => {
  if (!currentUser) return false;
  const isOwner = currentUser.id === item.user_id;
  const isAdmin = currentUser.role === 'admin';
  return isOwner || isAdmin;
};
```

### CRUD Operations
All features follow consistent CRUD patterns:
- **Create**: Form validation, image upload handling
- **Read**: Pagination, filtering, population of related data
- **Update**: Ownership/permission checks, partial updates
- **Delete**: Cascade deletion, file cleanup

### Notification System
- Automatic notifications for user interactions
- Types: trade_comment, trade_upvote, forum_reply, etc.
- Real-time updates via polling

## Troubleshooting

### Common Issues
- **Authentication errors**: Check token validity and expiration
- **CORS issues**: Verify FRONTEND_URL in .env matches your frontend URL
- **MongoDB connection**: Ensure MongoDB is running locally or connection string is correct
- **Image upload issues**: Check directory permissions and FormData structure

### Debugging Tips
- Check browser console for frontend errors
- Server logs contain detailed backend errors
- Use API health check endpoint: `GET /api/health`
- JWT validation issues often appear in auth.js middleware logs

## Project-Specific Conventions

### Naming
- File naming: PascalCase for components, camelCase for other files
- Variable naming: camelCase for variables, PascalCase for components/interfaces
- Database fields: snake_case in MongoDB documents

### API Response Format
- Success responses include relevant data or success message
- Error responses include `error` field with descriptive message
- Pagination responses include `pagination` object with `page`, `limit`, `total`, `pages`

### Component Structure
- Functional components with hooks
- useState for local state
- useEffect for side effects and data fetching
- Proper loading/error states for async operations

### DataTable Integration
- Admin pages use server-side pagination, sorting, and filtering
- DataTable endpoints follow pattern: `/api/admin/datatables/{resource}`
- Export functionality for CSV data export
- Bulk operations (delete, moderate) supported through dedicated endpoints

### CRUD Implementations
All major features (Trading, Forums, Events, Wishlists) follow consistent CRUD patterns with:
- Create operations with form validation
- Read operations with filtering, searching and pagination
- Update operations with permission checking
- Delete operations with confirmation

### Image Upload Pattern
```typescript
// Frontend: FormData for image uploads
const formData = new FormData();
formData.append('title', postData.title);
images.forEach(image => formData.append('images', image));

// Backend: Multer middleware handles uploads
const upload = multer({ dest: 'uploads/forum/' });
router.post('/', auth, upload.array('images'), controller.create);
```

### Vouching System
- Trade vouches: Users can vouch for successful trades
- Middleman vouches: Rating system for verified middlemen
- Credibility scores calculated from vouch history

### Advanced Features

**Real-time Updates**: Polling-based notification system for live updates
```typescript
// Frontend polling pattern
useEffect(() => {
  const interval = setInterval(() => {
    apiService.getNotifications({ unreadOnly: true });
  }, 30000); // Poll every 30 seconds
  return () => clearInterval(interval);
}, []);
```

**Bulk Operations**: Admin DataTables support bulk actions
```typescript
// Bulk delete pattern
async bulkDeleteEvents(eventIds: string[]) {
  return await this.request('/admin/datatables/events/bulk/delete', {
    method: 'POST',
    body: JSON.stringify({ eventIds })
  });
}
```

**Export Functionality**: CSV export for admin data
```typescript
// CSV export pattern
async exportEventsCSV(status?: string, type?: string) {
  const response = await fetch(`${API_BASE_URL}/admin/datatables/events/export/csv`, {
    headers: { 'Authorization': `Bearer ${this.token}` }
  });
  const blob = await response.blob();
  // Download logic...
}
