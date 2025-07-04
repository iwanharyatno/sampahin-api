const express = require('express');
const TPS = require('../models/TPS');
const User = require('../models/User');

const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', roleMiddleware('admin'), [
    body('name').notEmpty(),
    body('address').notEmpty(),
    body('latitude').notEmpty().isNumeric(),
    body('longitude').notEmpty().isNumeric(),
    body('contact_info').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, address, latitude, longitude, contact_info } = req.body;
        const allCode = await TPS.find().sort({
            created_at: "desc"
        });
        let latestCode = allCode[0]?.code.replace('TPS', '');
        if (!Number(latestCode)) latestCode = "000";
        const code = 'TPS' + (String(Number(latestCode) + 1).padStart(3, '0'));
        const result = await TPS.create({ name, address, latitude, longitude, contact_info, code, created_at: new Date() });
        return res.status(201).json(result);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const allTps = await TPS.find();
        return res.json(allTps);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/:code', async (req, res) => {
    try {
        const id = req.params.code;
        const result = await TPS.findOne({ code: id });
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/:code', roleMiddleware('admin'), [
    body('name').notEmpty(),
    body('address').notEmpty(),
    body('latitude').notEmpty().isNumeric(),
    body('longitude').notEmpty().isNumeric(),
    body('contact_info').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, address, latitude, longitude, contact_info } = req.body;

        await TPS.updateOne({ code: req.params.code }, { name, address, latitude, longitude, contact_info, updated_at: new Date() });
        const result = await TPS.findOne({ code: req.params.code });

        return res.status(201).json(result);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.delete('/:code', async (req, res) => {
    try {
        const id = req.params.code;
        const deleted = await TPS.findOne({ code: id });
        const result = await TPS.deleteOne({ code: id });
        return res.status(200).json({
            message: "Deleted successfully",
            tps: deleted
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});


router.get('/:tpsId/users', roleMiddleware('admin', 'collector'), async (req, res) => {
    try {
        const tpsId = req.params.tpsId;
        const users = await User.find({ tps: tpsId }).select('-password');
        return res.json(users);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;