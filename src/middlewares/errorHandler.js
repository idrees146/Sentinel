const { ZodError } = require('zod');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

function buildResponse(code, message, details) {
  const body = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return body;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(buildResponse(err.code, err.message, err.details));
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json(buildResponse('VALIDATION_ERROR', 'Invalid request payload', details));
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return res.status(400).json(buildResponse('VALIDATION_ERROR', 'Database validation failed', details));
  }

  if (err instanceof mongoose.Error.CastError) {
    return res
      .status(400)
      .json(buildResponse('INVALID_ID', `Invalid ${err.path}: ${err.value}`));
  }

  if (err && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res
      .status(409)
      .json(buildResponse('DUPLICATE_KEY', `Duplicate value for ${field}`, err.keyValue));
  }

  if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    return res.status(401).json(buildResponse('INVALID_TOKEN', 'Authentication token is invalid or expired'));
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(buildResponse('INVALID_JSON', 'Malformed JSON in request body'));
  }

  console.error('Unhandled error:', err);

  return res
    .status(500)
    .json(buildResponse('INTERNAL_ERROR', 'An unexpected error occurred on the server'));
}

module.exports = errorHandler;
