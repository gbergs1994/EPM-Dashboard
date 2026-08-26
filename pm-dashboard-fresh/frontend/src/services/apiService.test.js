// frontend/src/services/apiService.test.js
import ApiService from './apiService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('ApiService', () => {
  let apiService;

  beforeEach(() => {
    apiService = new ApiService();
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with default baseURL', () => {
      expect(apiService.baseURL).toBe('');
    });

    it('should use REACT_APP_API_URL if set', () => {
      process.env.REACT_APP_API_URL = 'http://test.com';
      const newService = new ApiService();
      expect(newService.baseURL).toBe('http://test.com');
      delete process.env.REACT_APP_API_URL;
    });

    it('should load token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      const newService = new ApiService();
      expect(newService.token).toBe('test-token');
    });
  });

  describe('getHeaders', () => {
    it('should return Content-Type header', () => {
      const headers = apiService.getHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include Authorization header when token exists', () => {
      apiService.token = 'test-token';
      const headers = apiService.getHeaders();
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should not include Authorization header when no token', () => {
      apiService.token = null;
      const headers = apiService.getHeaders();
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('handleResponse', () => {
    it('should return JSON for successful response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: 'test' }),
      };

      const result = await apiService.handleResponse(mockResponse);
      expect(result).toEqual({ success: true, data: 'test' });
    });

    it('should throw error for failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ error: 'Bad Request' }),
      };

      await expect(apiService.handleResponse(mockResponse)).rejects.toThrow('Bad Request');
    });

    it('should use default error message when no error in body', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      };

      await expect(apiService.handleResponse(mockResponse)).rejects.toThrow('HTTP 500');
    });
  });

  describe('login', () => {
    const credentials = { email: 'test@example.com', password: 'password' };
    const userData = { id: 1, name: 'Test User', email: 'test@example.com', role: 'Team Member' };

    it('should login successfully and store user data', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          user: userData,
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiService.login(credentials);

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      expect(result).toEqual({
        success: true,
        user: userData,
        message: undefined,
      });
      expect(apiService.token).toBe('user_1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'user_1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData));
    });

    it('should throw error on login failure', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Invalid credentials' }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      await expect(apiService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    const userData = { name: 'New User', email: 'new@example.com', password: 'password' };
    const responseUser = { id: 2, name: 'New User', email: 'new@example.com', role: 'Team Member' };

    it('should register successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          user: responseUser,
          message: 'User registered successfully',
        }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiService.register(userData);

      expect(result).toEqual({
        success: true,
        user: responseUser,
        message: 'User registered successfully',
      });
      expect(apiService.token).toBe('user_2');
    });
  });

  describe('getProjects', () => {
    it('should fetch projects successfully', async () => {
      apiService.token = 'test-token';
      const projects = [{ id: 1, name: 'Test Project' }];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: projects }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiService.getProjects();

      expect(global.fetch).toHaveBeenCalledWith('/api/projects', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });
      expect(result).toEqual({ success: true, data: projects });
    });
  });

  describe('getCareerGoals', () => {
    it('should fetch career goals for current user', async () => {
      apiService.token = 'user_1';
      const goals = [{ id: 1, title: 'Test Goal', status: 'active' }];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: goals }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      // Mock getCurrentUser
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ id: 1, name: 'Test User' }));

      const result = await apiService.getCareerGoals();

      expect(global.fetch).toHaveBeenCalledWith('/api/career/goals/1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user_1',
        },
      });
      expect(result).toEqual({
        success: true,
        data: goals,
        goals: goals
      });
    });

    it('should fetch career goals for specified user', async () => {
      apiService.token = 'user_1';
      const goals = [{ id: 1, title: 'Test Goal', status: 'active' }];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: goals }),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await apiService.getCareerGoals(2);

      expect(global.fetch).toHaveBeenCalledWith('/api/career/goals/2', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user_1',
        },
      });
      expect(result).toEqual({
        success: true,
        data: goals,
        goals: goals
      });
    });

    it('should return error when no user ID available', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await apiService.getCareerGoals();

      expect(result).toEqual({
        success: false,
        error: 'No user ID available',
        data: [],
        goals: []
      });
    });
  });
});