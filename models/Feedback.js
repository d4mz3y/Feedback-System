const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    clientName: String,
    clientAddress: String,
    numGuards: Number,
    deploymentDate: String,
    clientEmail: String,
    phoneNumber: String,
    howFoundOut: String,
    howFoundOutOther: String,
    referredByStaff: String,
    deploymentOfficer: String,
    generalComment: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
