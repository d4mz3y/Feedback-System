const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

adminUserSchema.methods.verifyPassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

adminUserSchema.statics.hashPassword = function (password) {
    return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
