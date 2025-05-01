const express = require("express");
const roleMiddleware = require("../middlewares/roleMiddleware");
const PickupRequest = require("../models/PickupRequest");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middlewares/authMiddleware");
const { body, validationResult } = require("express-validator");
const { storage } = require("../firebase/config");
const upload = require("../utils/file");

const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const router = express.Router();

// const allowedStatus = ['requested', 'in_progress', 'completed', 'rejected'];
// const allowedTrashType = ['organic', 'inorganic'];

router.use(authMiddleware);

router.post('/', roleMiddleware('customer'), upload.single('photo'), [
    body('trash_type').notEmpty(),
    body('weight').notEmpty().isNumeric(),
    body('latitude').notEmpty().isNumeric(),
    body('longitude').notEmpty().isNumeric(),
    body('address').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { trash_type, weight, latitude, longitude, address } = req.body;

        let photo_url = null;

        // Upload file to Firebase if provided
        if (req.file) {
            const fileName = `trash-images/${uuidv4()}_${req.file.originalname}`;
            const fileRef = ref(storage, fileName);

            await uploadBytes(fileRef, req.file.buffer, {
                contentType: req.file.mimetype,
            });
            photo_url = await getDownloadURL(fileRef);
        }

        const result = await PickupRequest.create({
            user: req.user._id, trash_type, weight,
            latitude, longitude, address,
            photo_url,
            note: req.body.note,
            created_at: new Date(),
            updated_at: new Date(),
        });
        return res.status(201).json(result);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.get('/mine', roleMiddleware('customer'), async (req, res) => {
    try {
        const allReqs = await PickupRequest.find({ user: req.user._id });
        return res.status(200).json(allReqs);
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

router.put('/:id', roleMiddleware('customer'), upload.single('photo'), [
    body('weight').optional().isNumeric(),
    body('status').optional().isIn(['requested', 'in_progress', 'completed', 'rejected']),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { id } = req.params;
        const { weight, status } = req.body;

        const request = await PickupRequest.findById(id).populate('user');
        if (!request) return res.status(404).json({ message: "Pickup request not found." });

        // Optional: Ensure user owns the request
        if (String(request.user._id) !== String(req.user._id)) {
            return res.status(403).json({ message: "Not allowed to edit this request." });
        }

        // Update image if provided
        if (req.file) {
            const fileName = `trash-images/${uuidv4()}_${req.file.originalname}`;
            const fileRef = ref(storage, fileName);

            await uploadBytes(fileRef, req.file.buffer, {
                contentType: req.file.mimetype,
            });

            request.photo_url = await getDownloadURL(fileRef);
        }

        // Update allowed fields
        if (weight !== undefined) request.weight = weight;
        if (status !== undefined) request.status = status;
        request.updated_at = new Date();

        await request.save();

        return res.status(200).json(request);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});


module.exports = router;