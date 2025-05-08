const jwt = require("jsonwebtoken");
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No authentication token provided.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ _id: decoded.id });

      if (!user) {
        console.log('User not found for token');
        return res.status(401).json({ message: 'User not found.' });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError.message);
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed.' });
  }
};

module.exports = auth;
