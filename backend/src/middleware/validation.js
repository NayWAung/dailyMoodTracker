// Validation middleware for Daily Mood Tracker API
// Implements constitutional validation requirements and security

const { MoodEntry } = require('../models/MoodEntry');

// Validate mood entry creation/update
const validateMoodEntry = (req, res, next) => {
  const { body } = req;

  // Basic structure validation
  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      error: 'Request body must be a valid JSON object'
    });
  }

  // Use model validation
  const validation = MoodEntry.validateInput(body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.errors.join('; '),
      details: validation.errors
    });
  }

  next();
};

// Validate date parameter in URL
const validateDateParam = (req, res, next) => {
  const { date } = req.params;

  if (!date) {
    return res.status(400).json({
      error: 'Date parameter is required'
    });
  }

  // Check date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      error: 'Invalid date format. Use YYYY-MM-DD format'
    });
  }

  // Validate actual date
  const dateObj = new Date(date);
  const [year, month, day] = date.split('-').map(Number);
  
  if (dateObj.getFullYear() !== year ||
      dateObj.getMonth() + 1 !== month ||
      dateObj.getDate() !== day) {
    return res.status(400).json({
      error: 'Invalid date. Please provide a valid date in YYYY-MM-DD format'
    });
  }

  req.validatedDate = date;
  next();
};

// Validate query parameters for GET /api/moods
const validateMoodListQuery = (req, res, next) => {
  const { limit, page, from, to } = req.query;
  const errors = [];

  // Validate limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      errors.push('Limit must be a positive integer');
    } else if (limitNum > 100) {
      errors.push('Limit cannot exceed 100');
    } else {
      req.query.limit = limitNum;
    }
  }

  // Validate page
  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    } else {
      req.query.page = pageNum;
    }
  }

  // Validate from date
  if (from !== undefined) {
    if (!isValidDateString(from)) {
      errors.push('From date must be in YYYY-MM-DD format');
    }
  }

  // Validate to date
  if (to !== undefined) {
    if (!isValidDateString(to)) {
      errors.push('To date must be in YYYY-MM-DD format');
    }
  }

  // Validate date range logic
  if (from && to && from > to) {
    errors.push('From date cannot be after to date');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: errors.join('; '),
      details: errors
    });
  }

  next();
};

// Security validation middleware
const validateSecurity = (req, res, next) => {
  // Prevent obvious SQL injection attempts - but allow HTML content for notes
  // (XSS prevention happens on output, not input)
  const suspiciousPatterns = [
    /['";].*(?:DROP|DELETE|INSERT|UPDATE|SELECT).*['";]/i,
    /UNION.*SELECT/i,
    /\/\*.*\*\//
    // Removed script tag validation - XSS prevention should be on output
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  // Check all string values in body and params
  const allValues = [
    ...Object.values(req.body || {}),
    ...Object.values(req.params || {}),
    ...Object.values(req.query || {})
  ];

  if (allValues.some(checkValue)) {
    return res.status(400).json({
      error: 'Invalid input detected'
    });
  }

  next();
};

// Content type validation
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

// Helper function to validate date strings
function isValidDateString(dateString) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  
  return date.getFullYear() === year &&
         date.getMonth() + 1 === month &&
         date.getDate() === day;
}

// Error response helper
const createErrorResponse = (message, statusCode = 400, details = null) => {
  const response = { error: message };
  if (details) {
    response.details = details;
  }
  return response;
};

module.exports = {
  validateMoodEntry,
  validateDateParam,
  validateMoodListQuery,
  validateSecurity,
  validateContentType,
  createErrorResponse
};