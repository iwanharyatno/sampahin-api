const express = require('express');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { generateToken } = require('../utils/jwt');
const authMiddleware = require('../middlewares/authMiddleware');
const TPS = require('../models/TPS');
const PickupRequest = require('../models/PickupRequest');
const upload = require("../utils/file");
const { storage } = require('../firebase/config');
const { v4: uuidv4 } = require("uuid");
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const path = require('path');

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
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, email, password } = req.body;

        let role = 'customer';

        if (req.body.code && req.body.code === process.env.ADMIN_TOKEN) role = 'admin';

        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists!' });

        const tpsReq = await TPS.findOne({ code: req.body.code });
        let tps = null;

        if (tpsReq) {
            tps = tpsReq._id;
            role = "collector";
        }

        const user = await User.create(
            { name, email, password, role, tps }
        );
        res.status(201).json({ message: 'User registered successfully!', user });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

router.post('/register/:email', [
    body('phone').notEmpty().withMessage('Phone is required'),
    body('gender').notEmpty().withMessage('Gender is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('longitude').notEmpty().withMessage('Longitude is required'),
    body('latitude').notEmpty().withMessage('Latitude is required')
], async (req, res) => {
    const errors = validationResult(req);
    const email = req.params.email;

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { phone, address, longitude, latitude, gender } = req.body;

        await User.updateOne(
            { email },
            { phone, address, longitude, latitude, gender },
            { upsert: true, runValidators: false }
        );

        const user = await User.findOne({ email });
        res.status(201).json({ message: 'User updated successfully!', user, token: generateToken(user) });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

router.post('/forgot-password', [
    body('email').notEmpty().withMessage('Email is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

        const message = `
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your password. Click the link below to reset it.</p>
            <a href="${resetURL}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block;">Reset Password</a>
            <p>This link will expire in 10 minutes.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Your password reset token (valid for 10 mins)',
                message
            });

            res.status(200).json({
                status: 'success',
                message: 'Token sent to email!'
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'There was an error sending the email. Try again later!' });
        }
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

router.get('/reset-password/:token', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token is invalid or has expired' });
        }

        if (req.body.password !== req.body.passwordConfirm) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.markModified('password');
        await user.save();

        res.status(200).json({ message: 'Password successfully reset!' });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

router.get('/reset-password-success', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/reset-password-success.html'));
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

router.put('/user', upload.single('profile'), [
    body('name').optional().isLength({ max: 100 }),
    body('phone').optional().isLength({ max: 15 }),
    body('address').optional(),
    body('gender').optional().isIn(['male', 'female']),
    body('latitude').optional().isNumeric(),
    body('longitude').optional().isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const updates = {};
        const fields = ['name', 'phone', 'address', 'gender', 'latitude', 'longitude'];

        // Add simple fields to updates
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // If profile picture was uploaded
        if (req.file) {
            const fileName = `profile-pictures/${uuidv4()}_${req.file.originalname}`;
            const fileRef = ref(storage, fileName);

            await uploadBytes(fileRef, req.file.buffer, {
                contentType: req.file.mimetype
            });

            const downloadURL = await getDownloadURL(fileRef);
            updates.profile_url = downloadURL;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password').populate("tps");

        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/user/stats', async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).select('points');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const aggregate = await PickupRequest.aggregate([
            {
                $match: {
                    user: user._id,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total_kg: { $sum: '$weight' }
                }
            }
        ]);

        const total_kg = aggregate.length > 0 ? aggregate[0].total_kg : 0;

        return res.status(200).json({
            total_points: user.points,
            total_kg
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;