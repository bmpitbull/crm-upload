const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('Auth middleware triggered');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('No token provided');
    return res.sendStatus(401);
  }
console.log('JWT_SECRET (middleware):', process.env.JWT_SECRET);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;