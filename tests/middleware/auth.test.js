const jwt = require('jsonwebtoken');
const requireAuth = require('../../src/middleware/auth');

describe('requireAuth middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('should return 401 if authorization header is missing', () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic somebase64credentials' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Your session is invalid or has expired' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set request.userId and call next if token is valid', () => {
    const validToken = jwt.sign({ userId: 42 }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.userId).toBe(42);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
