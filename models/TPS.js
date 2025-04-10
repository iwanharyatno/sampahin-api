const mongoose = require('mongoose');

const TPSSchema = new mongoose.Schema({
    code: {
        type: String,
    },
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
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
    contact_info: {
        type: String,
        required: true,
    },
    created_at: {
        type: Date,
        required: true,
    }
});

module.exports = mongoose.model('TPS', TPSSchema);