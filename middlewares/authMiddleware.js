const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId).select('-password');
        if (!req.user) return res.status(401).json({ message: 'User not found' });
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

module.exports = authMiddleware;