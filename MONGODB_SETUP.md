# BloxMarket V2 - MongoDB Setup Guide 🎮

## 🍃 MongoDB Migration Complete!

Your BloxMarket project has been successfully migrated from MySQL to **MongoDB**. Here's everything you need to know about the new setup.

## 🔄 What Changed

### Database Migration
- **From:** MySQL with SQL queries
- **To:** MongoDB with Mongoose ODM
- **Benefits:** More flexible schema, better performance for document-based data, easier scaling

### New Dependencies
- `mongoose`: MongoDB object modeling
- Removed: `mysql2`
- All CRUD operations now use MongoDB queries

## 🚀 Getting Started

### 1. Install MongoDB

**Download and Install MongoDB:**
- Visit [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- Download the installer for Windows
- Install with default settings
- MongoDB will run on `mongodb://localhost:27017`

**Or use MongoDB Atlas (Cloud):**
- Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
- Create a free cluster
- Get your connection string

### 2. Start MongoDB Service

**Windows Service:**
```cmd
# Start MongoDB service
net start MongoDB

# Stop MongoDB service  
net stop MongoDB
```

**Manual Start:**
```cmd
# Navigate to MongoDB bin directory
cd "C:\Program Files\MongoDB\Server\7.0\bin"

# Start MongoDB
mongod
```

### 3. Install Dependencies

```cmd
cd c:\BloxMarketV2\backend
npm install
```

### 4. Configure Environment

Update your `.env` file:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/bloxmarket

# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bloxmarket

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

### 5. Start Your Application

```cmd
# Start both frontend and backend
cd c:\BloxMarketV2
start-dev.bat

# Or manually:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## 📊 Database Collections

Your MongoDB database will automatically create these collections:

### 🔐 **users**
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password_hash: String,
  roblox_username: String,
  avatar_url: String,
  credibility_score: Number,
  role: String, // 'user', 'mm', 'mw', 'admin', 'moderator'
  createdAt: Date,
  updatedAt: Date
}
```

### 🛒 **trades**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  item_offered: String,
  item_requested: String,
  description: String,
  status: String, // 'open', 'in_progress', 'completed', 'cancelled'
  images: [{
    image_url: String,
    uploaded_at: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 💬 **forumposts & forumcomments**
```javascript
// Forum Posts
{
  _id: ObjectId,
  user_id: ObjectId (ref: User),
  category: String,
  title: String,
  content: String,
  upvotes: Number,
  downvotes: Number,
  createdAt: Date,
  updatedAt: Date
}

// Forum Comments
{
  _id: ObjectId,
  post_id: ObjectId (ref: ForumPost),
  user_id: ObjectId (ref: User),
  content: String,
  createdAt: Date,
  updatedAt: Date
}
```

### ⭐ **vouches**
```javascript
{
  _id: ObjectId,
  vouched_user_id: ObjectId (ref: User),
  given_by_user_id: ObjectId (ref: User),
  rating: Number, // 1-5
  comment: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Key Differences from MySQL

### Query Changes
```javascript
// OLD MySQL way:
const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

// NEW MongoDB way:
const user = await User.findOne({ username });
```

### ID Fields
```javascript
// OLD: user_id (integer)
// NEW: _id (ObjectId)

// Accessing IDs:
user._id          // MongoDB ObjectId
user._id.toString() // Convert to string
```

### Relationships
```javascript
// Population (like SQL JOINs):
const trade = await Trade.findById(id).populate('user_id', 'username email');
```

## 🛠️ Development Tools

### MongoDB Compass (GUI)
- Download [MongoDB Compass](https://www.mongodb.com/try/download/compass)
- Connect to `mongodb://localhost:27017`
- View and manage your data visually

### MongoDB Shell
```cmd
# Connect to your database
mongosh mongodb://localhost:27017/bloxmarket

# Basic commands:
show collections
db.users.find()
db.trades.find().pretty()
```

## 🔍 Testing Your Setup

### 1. Health Check
Visit: http://localhost:5000/api/health

### 2. Create a Test User
```javascript
// POST http://localhost:5000/api/auth/register
{
  "username": "testuser",
  "email": "test@example.com", 
  "password": "password123",
  "robloxUsername": "TestRobloxUser"
}
```

### 3. Verify in Database
```cmd
mongosh mongodb://localhost:27017/bloxmarket
db.users.find().pretty()
```

## 🚨 Common Issues & Solutions

### MongoDB Not Starting
```cmd
# Check if MongoDB service is running
sc query MongoDB

# Start MongoDB service
net start MongoDB
```

### Connection Errors
- Ensure MongoDB is running on port 27017
- Check your MONGODB_URI in .env file
- Verify firewall settings

### Schema Validation Errors
- MongoDB will auto-create collections
- Mongoose handles schema validation
- Check console for specific error messages

## 🎯 Next Steps

1. **Start MongoDB** service
2. **Install dependencies** (`npm install` in backend)
3. **Run your app** with `start-dev.bat`
4. **Register a user** to test the connection
5. **Check MongoDB Compass** to see your data

## 🤝 Need Help?

If you encounter any issues with the MongoDB migration:

1. Check MongoDB service is running
2. Verify your .env configuration
3. Look at console logs for specific errors
4. Test the connection with MongoDB Compass

Your BloxMarket is now powered by MongoDB! 🚀✨