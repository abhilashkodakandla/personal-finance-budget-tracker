const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  // Skip protection in test environment and set a mock user
  if (process.env.MODE_ENVIROMENT === 'test') {
    req.user = {
      _id: '6803d48bbffc189a530ba991',
      name: 'test',
      email: 'test@gmail.com',
    };
    return next();
  }

  let token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token failed' });
  }
};

module.exports = { protect };
