// backend/tests/unit/authController.test.js
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock database
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const { query } = require('../../src/config/database');
const authController = require('../../src/controllers/authController');

// Mock req/res
const mockReq = (body = {}, user = null) => ({ body, user });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const newUser = {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Team Member',
        avatar: 'JD',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      // Mock database calls
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id FROM users WHERE email')) {
          return Promise.resolve({ rows: [] }); // No existing user
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({ rows: [newUser] });
        }
      });

      // Mock bcrypt
      bcrypt.hash.mockResolvedValue(hashedPassword);

      const req = mockReq(validUserData);
      const res = mockRes();

      await authController.register(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'Team Member',
          avatar: 'JD',
          created_at: '2024-01-01T00:00:00.000Z'
        }
      });
    });

    it('should register user with Project Manager role when specified', async () => {
      const userDataWithRole = { ...validUserData, role: 'Project Manager' };
      const newUser = {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Project Manager',
        avatar: 'JS',
        created_at: '2024-01-01T00:00:00.000Z'
      };

      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id FROM users WHERE email')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({ rows: [newUser] });
        }
      });

      bcrypt.hash.mockResolvedValue('hashedPassword');

      const req = mockReq(userDataWithRole);
      const res = mockRes();

      await authController.register(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['Jane Smith', 'jane.smith@example.com', 'hashedPassword', 'Project Manager', 'JS'])
      );
    });

    it('should return error for missing required fields', async () => {
      const req = mockReq({ name: 'John Doe' }); // Missing email and password
      const res = mockRes();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name, email, and password are required'
      });
    });

    it('should return error for existing user', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] }); // Existing user

      const req = mockReq(validUserData);
      const res = mockRes();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User with this email already exists'
      });
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      const req = mockReq(validUserData);
      const res = mockRes();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Registration failed'
      });
    });

    it('should handle bcrypt errors', async () => {
      bcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

      const req = mockReq(validUserData);
      const res = mockRes();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Registration failed'
      });
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const mockUser = {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '$2a$10$hashedPassword',
      role: 'Team Member',
      avatar: 'JD',
      created_at: '2024-01-01T00:00:00.000Z'
    };

    it('should login user successfully with bcrypt password', async () => {
      query.mockResolvedValue({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);

      const req = mockReq(validCredentials);
      const res = mockRes();

      await authController.login(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, email, password, role, avatar, created_at FROM users'),
        ['john.doe@example.com']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2a$10$hashedPassword');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'Team Member',
          avatar: 'JD',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        message: 'Login successful'
      });
    });

    it('should login user successfully with plain text password (backward compatibility)', async () => {
      const userWithPlainPassword = { ...mockUser, password: 'password123' };
      query.mockResolvedValue({ rows: [userWithPlainPassword] });

      const req = mockReq(validCredentials);
      const res = mockRes();

      await authController.login(req, res);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: 1,
          name: 'John Doe',
          email: 'john.doe@example.com'
        }),
        message: 'Login successful'
      });
    });

    it('should return error for missing email or password', async () => {
      const req = mockReq({ email: 'john@example.com' }); // Missing password
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email and password are required'
      });
    });

    it('should return error for non-existent user', async () => {
      query.mockResolvedValue({ rows: [] });

      const req = mockReq(validCredentials);
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email or password'
      });
    });

    it('should return error for incorrect password', async () => {
      query.mockResolvedValue({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      const req = mockReq(validCredentials);
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email or password'
      });
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      const req = mockReq(validCredentials);
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Login failed'
      });
    });

    it('should handle bcrypt errors', async () => {
      query.mockResolvedValue({ rows: [mockUser] });
      bcrypt.compare.mockRejectedValue(new Error('Compare failed'));

      const req = mockReq(validCredentials);
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Login failed'
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const req = mockReq();
      const res = mockRes();

      await authController.logout(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return not implemented message', async () => {
      const req = mockReq();
      const res = mockRes();

      await authController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Get current user - Coming soon (requires JWT implementation)'
      });
    });
  });

  describe('refreshToken', () => {
    it('should return not implemented message', async () => {
      const req = mockReq();
      const res = mockRes();

      await authController.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token - Coming soon'
      });
    });
  });

  describe('verifyToken', () => {
    it('should return not implemented message', async () => {
      const req = mockReq();
      const res = mockRes();

      await authController.verifyToken(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Verify token - Coming soon'
      });
    });
  });

  describe('forgotPassword', () => {
    it('should return not implemented message', async () => {
      const req = mockReq();
      const res = mockRes();

      await authController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forgot password - Coming soon'
      });
    });
  });

  describe('resetPassword', () => {
    it('should return not implemented message', async () => {
      const req = mockReq();
      const res = mockRes();

      await authController.resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Reset password - Coming soon'
      });
    });
  });
});