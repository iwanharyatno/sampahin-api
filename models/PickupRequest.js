const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PickupRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    collector: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['requested', 'in_progress', 'completed', 'rejected'],
        required: true,
        default: 'requested'
    },
    trash_type: {
        type: String,
        enum: ['organic', 'inorganic'],
        required: true,
    },
    weight: {
        type: Number,
        required: true,
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    photo_url: String,
    pickup_date: Date,
    note: String,
    created_at: {
        type: Date,
        required: true,
    },
    updated_at: Date
});

module.exports = mongoose.model('PickupRequest', PickupRequestSchema);