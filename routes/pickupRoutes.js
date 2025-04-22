const express = require("express");
const roleMiddleware = require("../middlewares/roleMiddleware");
const PickupRequest = require("../models/PickupRequest");
const authMiddleware = require("../middlewares/authMiddleware");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// const allowedStatus = ['requested', 'in_progress', 'completed', 'rejected'];
// const allowedTrashType = ['organic', 'inorganic'];

router.use(authMiddleware);

router.post('/', roleMiddleware('customer'), [
    body('status').notEmpty(),
    body('trash_type').notEmpty(),
    body('weight').notEmpty().isNumeric(),
    body('latitude').notEmpty().isNumeric(),
    body('longitude').notEmpty().isNumeric(),
    body('address').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { status, trash_type, weight, latitude, longitude, address } = req.body;
        const result = await PickupRequest.create({
            user: req.user._id, status, trash_type, weight,
            latitude, longitude, address,
            photo_url: req.body.photo_url,
            note: req.body.note,
            created_at: new Date(),
            updated_at: new Date(),
        });
        return res.status(201).json(result);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/', roleMiddleware('admin', 'collector'), async (req, res) => {
    try {
        const allReqs = await PickupRequest.find().populate('user');
        return res.status(200).json(allReqs);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/:id', roleMiddleware('admin', 'collector'), async (req, res) => {
    try {
        const id = req.params.id;
        const reqs = await PickupRequest.findOne({ _id: id }).populate('user');
        return res.status(200).json(reqs);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;