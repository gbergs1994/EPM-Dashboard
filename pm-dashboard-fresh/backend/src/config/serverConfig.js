// backend/src/config/serverConfig.js
// Server configuration fixes

/**
 * Configure Express app with proper trust proxy settings
 */
const configureApp = (app) => {
    // FIXED: Set trust proxy correctly at app level for production
    // Only enable in production behind a reverse proxy
    if (process.env.NODE_ENV === 'production') {
      // Trust first proxy (like nginx, cloudflare, etc.)
      app.set('trust proxy', 1);
    } else {
      // In development, don't trust proxy
      app.set('trust proxy', false);
    }
    
    return app;
  };
  
  /**
   * Get client IP address safely
   */
  const getClientIP = (req) => {
    if (process.env.NODE_ENV === 'production') {
      return req.ip || req.connection.remoteAddress;
    } else {
      return req.connection.remoteAddress || 'localhost';
    }
  };
  
  module.exports = {
    configureApp,
    getClientIP
  };