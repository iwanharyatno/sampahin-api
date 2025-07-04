const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 100
    },
    password: {
        type: String,
        required: true,
        maxlength: 100
    },
    phone: {
        type: String,
        maxlength: 15
    },
    role: {
        type: String,
        enum: ['customer', 'collector', 'admin'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned'],
        default: 'active'
    },
    address: String,
    gender: {
        type: String,
        enum: ['male', 'female'],
    },
    longitude: Number,
    latitude: Number,
    tps: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TPS"
    },
    points: {
        type: Number,
        default: 0
    },
    profile_url: {
        type: String
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.comparePassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

module.exports = mongoose.model("User", UserSchema);