const express = require('express');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

router.post('/login', [
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(401).json({ errors: errors.array() });

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ message: 'Invalid credentials' });

        res.json({ message: "Login successful", token: generateToken(user) });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(401).json({ errors: errors.array() });

    try {
        const { name, email, password } = req.body;
        
        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists!' });

        const user = await User.create({ name, email, password, role: 'customer' });
        res.status(201).json({ message: 'User registered successfully!', token: generateToken(user) });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

module.exports = router;