import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Dynamically read JWT secret at runtime
const getJwtSecret = () => process.env.JWT_SECRET?.trim() || 'your-secret-key';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.split(' ')[1]?.trim();

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      // Read the secret at runtime (after dotenv has loaded)
      const secret = getJwtSecret();
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      console.log('JWT verification error:', jwtError.name, jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(401).json({ error: 'Token verification failed' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokenExists = user.tokens && user.tokens.some(t => t.token === token);
    if (!tokenExists) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (user.role === 'banned') return res.status(403).json({ error: 'Account is banned' });
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });

    // Check for active penalties and handle them based on type
    const now = new Date();
    const activePenalties = user.penalties?.filter(penalty => 
      penalty.is_active && (!penalty.expires_at || penalty.expires_at > now)
    ) || [];

    // Handle suspensions (block access)
    const activeSuspensions = activePenalties.filter(p => p.type === 'suspension');
    if (activeSuspensions.length > 0) {
      const suspension = activeSuspensions[0]; // Get the most severe suspension
      const expiryMessage = suspension.expires_at 
        ? ` until ${suspension.expires_at.toLocaleDateString()}`
        : ' permanently';
      return res.status(403).json({ 
        error: `Account is suspended${expiryMessage}. Reason: ${suspension.reason}` 
      });
    }

    // Handle critical strikes (block access)
    const activeCriticalStrikes = activePenalties.filter(p => p.type === 'strike' && p.severity === 'critical');
    if (activeCriticalStrikes.length > 0) {
      const strike = activeCriticalStrikes[0];
      const expiryMessage = strike.expires_at 
        ? ` until ${strike.expires_at.toLocaleDateString()}`
        : ' permanently';
      return res.status(403).json({ 
        error: `Account has a critical strike${expiryMessage}. Reason: ${strike.reason}` 
      });
    }

    // For warnings and restrictions, allow access but add penalty info to user data
    const warningsAndRestrictions = activePenalties.filter(p => 
      p.type === 'warning' || p.type === 'restriction' || 
      (p.type === 'strike' && p.severity !== 'critical')
    );

    // Check and update expired penalties
    if (user.penalties && user.penalties.length > 0) {
      let hasExpiredPenalties = false;
      user.penalties = user.penalties.map(penalty => {
        if (penalty.is_active && penalty.expires_at && penalty.expires_at <= now) {
          penalty.is_active = false;
          hasExpiredPenalties = true;
        }
        return penalty;
      });

      if (hasExpiredPenalties) {
        // Recalculate active penalties count
        user.active_penalties = user.penalties.filter(p => p.is_active).length;
        await user.save();
      }
    }

    // Set req.user with both decoded token data and full user object
    req.user = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      userData: user,
      // Include active penalties for warnings/restrictions
      activePenalties: warningsAndRestrictions.length > 0 ? warningsAndRestrictions : undefined
    };
    req.token = token;
    
    console.log('Authenticated user:', req.user.username, 'Role:', req.user.role);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireAdmin = (req, res, next) => {
  console.log('RequireAdmin check - User:', req.user?.username, 'Role:', req.user?.role);
  
  if (!req.user) {
    console.log('No user object found');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check role from req.user.role (set in authenticateToken)
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    console.log('Access denied - User role:', req.user.role);
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  console.log('Admin access granted');
  next();
};