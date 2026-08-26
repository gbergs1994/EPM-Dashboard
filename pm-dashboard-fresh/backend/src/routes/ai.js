const express = require('express');
const router = express.Router();

console.log('ðŸ”„ Loading AI routes...');

let aiController;
try {
  aiController = require('../controllers/aiController');
  console.log('âœ… AI controller loaded successfully from ../controllers/aiController');
} catch (error) {
  console.error('âŒ Failed to load AI controller:', error.message);
  
  aiController = {
    chat: async (req, res) => {
      console.log('ðŸ”„ Using fallback AI controller');
      res.json({
        success: true,
        response: `Hi ${req.user?.name || 'there'}! AI controller fallback is working. Your message was: "${req.body.message}"`,
        model: 'fallback-controller',
        tokensUsed: 0
      });
    },
    getProjectInsights: async (req, res) => {
      res.json({
        success: true,
        insights: { summary: 'Fallback insights' }
      });
    }
  };
}

let aiLimiter;
try {
  const rateLimit = require('express-rate-limit');
  aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: {
      success: false,
      error: 'Too many AI requests, please try again later.'
    }
  });
  console.log('âœ… Rate limiter loaded');
} catch (error) {
  console.log('âš ï¸ Rate limiter not available, using fallback');
  aiLimiter = (req, res, next) => next();
}

const aiAuth = async (req, res, next) => {
  try {
    let authToken = null;
    
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header received:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7); 
      console.log('🔍 Token from Authorization header:', authToken?.substring(0, 10) + '...');
    }
    
    if (!authToken) {
      console.log('❌ No authentication token found');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no token provided'
      });
    }

    console.log('🔍 Final token to process:', authToken?.substring(0, 15) + '...');
    
    // FIXED: Handle both "user_15" and "15" formats
    let userId = null;
    if (authToken.startsWith('user_')) {
      userId = parseInt(authToken.substring(5)); // Remove 'user_' prefix
      console.log('🔍 Extracted user ID from user_ token:', userId);
    } else if (!isNaN(authToken)) {
      userId = parseInt(authToken);
      console.log('🔍 Using direct numeric token as user ID:', userId);
    } else {
      console.log('❌ Token is not a valid format:', authToken);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    if (!userId || userId <= 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid user ID extracted from token'
      });
    }

    try {
      const { query } = require('../config/database');
      console.log('🔍 Looking up user ID:', userId);
      
      const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
      
      if (result.rows.length === 0) {
        console.log('❌ User not found for ID:', userId);
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      console.log('✅ AI auth success:', user.name, 'ID:', user.id);
      
      req.user = user;
      next();
      
    } catch (dbError) {
      console.error('❌ Database error during auth:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Authentication database error'
      });
    }

  } catch (error) {
    console.error('❌ AI auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

const validateChatRequest = (req, res, next) => {
  console.log('ðŸ” Validating chat request:', { message: req.body.message?.substring(0, 50) });
  
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be a string'
    });
  }
  
  if (message.length < 1 || message.length > 4000) {
    return res.status(400).json({
      success: false,
      error: 'Message must be between 1 and 4000 characters'
    });
  }
  
  console.log('âœ… Chat request validation passed');
  next();
};

router.use((req, res, next) => {
  console.log(`ðŸ¤– AI Route: ${req.method} ${req.url}`);
  next();
});

router.use(aiAuth);
router.use(aiLimiter);

router.post('/chat', (req, res, next) => {
  console.log('ðŸŽ¯ POST /chat route hit');
  validateChatRequest(req, res, next);
}, async (req, res) => {
  try {
    console.log('ðŸš€ Calling aiController.chat');
    await aiController.chat(req, res);
  } catch (error) {
    console.error('âŒ Chat route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/insights/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId || (!Number.isInteger(Number(projectId)) || Number(projectId) < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Project ID must be a positive integer'
      });
    }
    
    await aiController.getProjectInsights(req, res);
  } catch (error) {
    console.error('âŒ Insights route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/health', (req, res) => {
  console.log('ðŸ’š AI health check called');
  res.json({
    success: true,
    message: 'AI service is running',
    timestamp: new Date().toISOString()
  });
});

router.use((error, req, res, next) => {
  console.error('ðŸ’¥ AI Route Error:', error.message);
  
  res.status(500).json({
    success: false,
    error: 'AI service error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

console.log('âœ… AI routes configured');

module.exports = router;