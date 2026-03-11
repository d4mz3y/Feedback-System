require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('MONGODB_URI not found in environment variables. Database storage is disabled.');
}

// Define Feedback Schema
const feedbackSchema = new mongoose.Schema({
    memberName: String,
    clientName: String,
    numGuards: Number,
    commencementDate: String,
    clientEmail: String,
    phoneNumber: String,
    rating: Number,
    comments: String,
    timestamp: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Explicit root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static assets from current directory
app.use(express.static(__dirname));

// API Endpoint to receive feedback
app.post('/api/feedback', async (req, res) => {
    console.log('Received feedback payload:', req.body);
    const {
        memberName,
        clientName,
        numGuards,
        commencementDate,
        clientEmail,
        phoneNumber,
        rating,
        comments
    } = req.body;

    if (!memberName || !clientName || !rating || !comments || !clientEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const feedbackData = {
        memberName,
        clientName,
        numGuards,
        commencementDate,
        clientEmail,
        phoneNumber,
        rating: Number(rating),
        comments
    };

    try {
        // 1. Save to MongoDB if URI is provided
        if (MONGODB_URI) {
            const newFeedback = new Feedback(feedbackData);
            await newFeedback.save();
            console.log('Feedback saved to MongoDB');
        }

        // 2. Send Email Notification
        console.log('Attempting to send email...');
        await sendEmailNotification({ ...feedbackData, timestamp: new Date().toLocaleString() });
        console.log('Email sent successfully');

        res.status(200).json({ message: 'Feedback stored and email sent' });
    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({ error: 'Failed to process feedback. Please try again later.' });
    }
});

async function sendEmailNotification(review) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.dreamhost.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Hogan Guards Feedback" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAILS,
        subject: `New Marketing Feedback: ${review.memberName}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #B5253C; border-radius: 10px; max-width: 600px;">
                <h2 style="color: #113C63; margin-top: 0;">New Team Feedback Received</h2>
                <hr style="border: 0; border-top: 2px solid #B5253C; margin-bottom: 20px;">
                
                <h3 style="color: #B5253C; margin-bottom: 10px;">Marketing Representative Info</h3>
                <p><strong>Representative Name:</strong> ${review.memberName}</p>
                
                <h3 style="color: #B5253C; margin-bottom: 10px; margin-top: 20px;">Client & Job Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Client Name:</strong></td>
                        <td>${review.clientName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Email:</strong></td>
                        <td>${review.clientEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Phone:</strong></td>
                        <td>${review.phoneNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Number of Guards:</strong></td>
                        <td>${review.numGuards || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Commencement Date:</strong></td>
                        <td>${review.commencementDate || 'N/A'}</td>
                    </tr>
                </table>

                <h3 style="color: #B5253C; margin-bottom: 10px; margin-top: 20px;">Service Feedback</h3>
                <p><strong>Rating:</strong> ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} (${review.rating}/5)</p>
                <p><strong>Comments:</strong></p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 5px solid #B5253C; font-style: italic; color: #555;">
                    "${review.comments}"
                </div>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #777;">Submitted securely via Hogan Guards Feedback Portal at: ${review.timestamp}</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please run 'fuser -k ${PORT}/tcp' or change the port in .env`);
        process.exit(1);
    } else {
        console.error('Server error:', e);
    }
});
