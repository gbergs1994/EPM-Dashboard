// backend/src/controllers/authController.js
const { query } = require('../config/database');
const bcrypt = require('bcryptjs'); // Make sure you have this installed
const { USER_ROLES, normalizeUserRole } = require('../config/roles');

// Add this missing register function!
const register = async (req, res) => {
  try {
    console.log('🔑 Registration attempt for:', req.body.email);
    const { name, email, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }
    
    // Validate role - allow only the canonical three roles during registration
    const userRole = normalizeUserRole(role);
    
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Hash password properly
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with proper password hashing
    const createUserQuery = `
      INSERT INTO users (name, email, password, role, avatar, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, email, role, avatar, created_at
    `;
    
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    const result = await query(createUserQuery, [
      name.trim(),
      email.toLowerCase(),
      hashedPassword, // Use hashed password
      userRole,
      avatar
    ]);
    
    const newUser = result.rows[0];
    
    console.log('✅ Registration successful for:', newUser.name, 'as', newUser.role);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        created_at: newUser.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    console.log('🔑 Login attempt for:', req.body.email);
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Find user by email
    const userQuery = `
      SELECT id, name, email, password, role, avatar, created_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await query(userQuery, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    // Check password (handle both hashed and plain text for backward compatibility)
    let isValidPassword = false;

    if (!user.password) {
      // No password set — account cannot log in until a password is assigned
      isValidPassword = false;
    } else if (user.password.startsWith('$2')) {
      // It's a bcrypt hash
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Plain text password (for existing demo users)
      isValidPassword = password === user.password;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Prepare user data for response
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'Team Member',
      avatar: user.avatar || user.name?.split(' ').map(n => n[0]).join('') || 'U',
      created_at: user.created_at
    };
    
    console.log('✅ Login successful for:', userData.name, 'Role:', userData.role);
    
    res.json({
      success: true,
      user: userData, // Make sure this matches your frontend expectation
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

const logout = async (req, res) => {
  console.log('👋 Logout request received');
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

const getCurrentUser = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Get current user - Coming soon (requires JWT implementation)' 
  });
};

const refreshToken = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Refresh token - Coming soon' 
  });
};

const verifyToken = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Verify token - Coming soon' 
  });
};

const forgotPassword = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Forgot password - Coming soon' 
  });
};

const resetPassword = async (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Reset password - Coming soon' 
  });
};

module.exports = {
  register, // â† This was missing!
  login,
  logout,
  getCurrentUser,
  refreshToken,
  verifyToken,
  forgotPassword,
  resetPassword
};