const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    }
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
UserSchema.method()

module.exports = mongoose.model("User", UserSchema);