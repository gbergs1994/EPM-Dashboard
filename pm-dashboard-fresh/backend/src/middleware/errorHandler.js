class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler utility
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Custom API Error
  if (err instanceof ApiError) {
    error.statusCode = err.statusCode;
    error.message = err.message;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = { message: 'Duplicate field value entered', statusCode: 400 };
        break;
      case '23503': // Foreign key violation
        error = { message: 'Referenced record not found', statusCode: 400 };
        break;
      case '23502': // Not null violation
        error = { message: 'Required field is missing', statusCode: 400 };
        break;
      case '42P01': // Undefined table
        error = { message: 'Database table not found', statusCode: 500 };
        break;
      default:
        error = { message: 'Database error', statusCode: 500 };
    }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = { errorHandler, ApiError, asyncHandler };