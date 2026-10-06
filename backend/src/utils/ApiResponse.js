class ApiResponse {
  constructor(data, message = 'Success', statusCode = 200) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.statusCode = statusCode;
  }

  static success(data, message = 'Success', statusCode = 200) {
    return new ApiResponse(data, message, statusCode);
  }

  static created(data, message = 'Created') {
    return new ApiResponse(data, message, 201);
  }

  static noContent(message = 'Success') {
    return new ApiResponse(null, message, 204);
  }
}

module.exports = ApiResponse;