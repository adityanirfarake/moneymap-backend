const jwt = require('jsonwebtoken');

function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) return response.status(401).json({ message: 'Authentication is required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    request.userId = payload.userId;
    return next();
  } catch (error) {
    return response.status(401).json({ message: 'Your session is invalid or has expired' });
  }
}

module.exports = requireAuth;