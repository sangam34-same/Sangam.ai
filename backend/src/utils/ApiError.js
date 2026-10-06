class ApiError extends Error {
  constructor(message, statusCode = 500, errors = undefined, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message = 'Not found') {
    return new ApiError(message, 404);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(message, 409);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(message, 429);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(message, 500, undefined, false);
  }
}

module.exports = ApiError;