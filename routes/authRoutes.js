const express = require('express');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { generateToken } = require('../utils/jwt');
const authMiddleware = require('../middlewares/authMiddleware');
const TPS = require('../models/TPS');

const router = express.Router();

router.post('/login', [
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

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
    body('gender').notEmpty().withMessage('Gender is required'),
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, email, password, phone, gender } = req.body;

        let role = 'customer';

        if (req.body.code && req.body.code === process.env.ADMIN_TOKEN) role = 'admin';
        
        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists!' });

        const tpsReq = await TPS.findOne({ code: req.body.code });
        let tps = null;

        if (tpsReq) {
            tps = tpsReq._id;
            role = "collector";
        }

        const user = await User.create({ name, email, password, phone, role, gender, tps });
        res.status(201).json({ message: 'User registered successfully!', token: generateToken(user) });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

router.use(authMiddleware);

router.get('/user', async function (req, res) {
    try {
        let user = {};
        
        user = await User.findOne({ _id: req.user._id }).select('-password').populate("tps");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;