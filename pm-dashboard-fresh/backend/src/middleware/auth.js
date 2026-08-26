// backend/src/middleware/strictAuth.js
// Strict authentication - ONLY uses the logged-in user, no fallbacks

const { query } = require('../config/database');

const strictAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔒 Strict Auth - Headers:', {
      authorization: authHeader ? 'Present' : 'Missing',
      route: req.path
    });
    
    // Require authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required. Please log in.'
      });
    }

    const token = authHeader.substring(7); 
    console.log('🔍 Token received:', token?.substring(0, 15) + '...');
    
    // Parse user ID from token
    let userId = null;
    if (token.startsWith('user_')) {
      userId = parseInt(token.substring(5)); // Remove 'user_' prefix
      console.log('🔍 Extracted user ID from user_ token:', userId);
    } else if (!isNaN(token)) {
      userId = parseInt(token);
      console.log('🔍 Using direct numeric token as user ID:', userId);
    } else {
      console.log('❌ Invalid token format:', token);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format. Please log in again.'
      });
    }
    
    // Validate user ID
    if (!userId || userId <= 0 || isNaN(userId)) {
      console.log('❌ Invalid user ID extracted:', userId);
      return res.status(401).json({
        success: false,
        error: 'Invalid user ID in token. Please log in again.'
      });
    }

    // Look up ONLY the specified user - NO FALLBACKS
    try {
      const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) {
        console.log('❌ User not found for ID:', userId);
        return res.status(401).json({
          success: false,
          error: `User with ID ${userId} not found. Please log in again.`
        });
      }

      const user = result.rows[0];
      console.log('✅ Strict auth success - LOGGED IN USER:', user.name, 'ID:', user.id, 'Role:', user.role);
      
      req.user = user;
      next();
      
    } catch (dbError) {
      console.error('❌ Database error during strict auth:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Authentication database error'
      });
    }
    
  } catch (error) {
    console.error('❌ Strict auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = strictAuth;