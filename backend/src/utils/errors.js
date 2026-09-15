'use strict';
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}
const badRequest = (m, d) => new HttpError(400, 'BAD_REQUEST', m, d);
const unauthorized = (m = 'Authentication required') => new HttpError(401, 'UNAUTHORIZED', m);
const badCredentials = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid identifier or password');
const forbidden = (m = 'Insufficient permissions') => new HttpError(403, 'FORBIDDEN', m);
const notFound = (m = 'Not found') => new HttpError(404, 'NOT_FOUND', m);
const conflict = (code, m, d) => new HttpError(409, code, m, d);

module.exports = { HttpError, badRequest, unauthorized, badCredentials, forbidden, notFound, conflict };
