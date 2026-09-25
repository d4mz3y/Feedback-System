require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Running behind an nginx reverse proxy — trust its X-Forwarded-For
// so express-rate-limit can correctly identify client IPs.
app.set('trust proxy', 1);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('MONGODB_URI not found in environment variables. Database storage is disabled.');
}

// Define Onboarding/Referral Schema
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

const Feedback = mongoose.model('Feedback', feedbackSchema);

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

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

// Limit the public feedback endpoint to 5 submissions per IP every 15 minutes
const feedbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please try again later.' }
});

// API Endpoint to receive feedback
app.post('/api/feedback', feedbackLimiter, async (req, res) => {
    console.log('Received feedback payload:', req.body);
    const {
        clientName,
        clientAddress,
        numGuards,
        deploymentDate,
        clientEmail,
        phoneNumber,
        howFoundOut,
        howFoundOutOther,
        referredByStaff,
        deploymentOfficer,
        generalComment
    } = req.body;

    if (!clientName || !clientAddress || !clientEmail || !phoneNumber || !numGuards
        || !deploymentDate || !howFoundOut) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // A staff member is only relevant when the client says they were
    // referred by one — not for Website, Advert, or the other options.
    if (howFoundOut === 'Referred by Client' && !referredByStaff) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const feedbackData = {
        clientName,
        clientAddress,
        numGuards,
        deploymentDate,
        clientEmail,
        phoneNumber,
        howFoundOut,
        howFoundOutOther,
        referredByStaff,
        deploymentOfficer,
        generalComment
    };

    try {
        // 1. Save to MongoDB if URI is provided
        if (MONGODB_URI) {
            const newFeedback = new Feedback(feedbackData);
            await newFeedback.save();
            console.log('Feedback saved to MongoDB');
        }
    } catch (error) {
        console.error('Error saving feedback:', error);
        return res.status(500).json({ error: 'Failed to process feedback. Please try again later.' });
    }

    // 2. Send Email Notification — the feedback is already saved at this point,
    // so an email failure shouldn't tell the client to resubmit.
    try {
        console.log('Attempting to send email...');
        await sendEmailNotification({ ...feedbackData, timestamp: new Date().toLocaleString() });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email notification:', error);
    }

    // 3. Send the client a confirmation — independent of the admin notification above.
    try {
        await sendClientConfirmation(feedbackData);
        console.log('Client confirmation email sent');
    } catch (error) {
        console.error('Error sending client confirmation email:', error);
    }

    res.status(200).json({ message: 'Feedback received' });
});

const transporter = nodemailer.createTransport({
    host: 'smtp.dreamhost.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmailNotification(review) {
    const howFoundOutDisplay = review.howFoundOut === 'Others' && review.howFoundOutOther
        ? `Others — ${review.howFoundOutOther}`
        : review.howFoundOut;

    const mailOptions = {
        from: `"Hogan Guards Onboarding" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAILS,
        subject: `New Client Onboarding Submission: ${review.clientName}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #B5253C; border-radius: 10px; max-width: 600px;">
                <h2 style="color: #113C63; margin-top: 0;">New Client Onboarding Submission</h2>
                <hr style="border: 0; border-top: 2px solid #B5253C; margin-bottom: 20px;">

                <h3 style="color: #B5253C; margin-bottom: 10px;">Client Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Name of Client:</strong></td>
                        <td>${escapeHtml(review.clientName)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Address:</strong></td>
                        <td>${escapeHtml(review.clientAddress)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Official Email:</strong></td>
                        <td>${escapeHtml(review.clientEmail)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Phone:</strong></td>
                        <td>${escapeHtml(review.phoneNumber)}</td>
                    </tr>
                </table>

                <h3 style="color: #B5253C; margin-bottom: 10px; margin-top: 20px;">Deployment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Number of Guards:</strong></td>
                        <td>${escapeHtml(review.numGuards || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Date of Deployment:</strong></td>
                        <td>${escapeHtml(review.deploymentDate || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Deployment Officer:</strong></td>
                        <td>${escapeHtml(review.deploymentOfficer || 'N/A')}</td>
                    </tr>
                </table>

                <h3 style="color: #B5253C; margin-bottom: 10px; margin-top: 20px;">How They Found HoganGuards</h3>
                <p><strong>${escapeHtml(howFoundOutDisplay)}</strong></p>
                ${review.referredByStaff ? `<p><strong>Referred by staff:</strong> ${escapeHtml(review.referredByStaff)}</p>` : ''}

                ${review.generalComment ? `
                <h3 style="color: #B5253C; margin-bottom: 10px; margin-top: 20px;">General Comment on Deployment</h3>
                <div style="background: #f8f9fa; padding: 15px; border-left: 5px solid #B5253C; font-style: italic; color: #555;">
                    "${escapeHtml(review.generalComment)}"
                </div>
                ` : ''}

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #777;">Submitted securely via Hogan Guards Onboarding Portal at: ${review.timestamp}</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

async function sendClientConfirmation(review) {
    const mailOptions = {
        from: `"Hogan Guards" <${process.env.EMAIL_USER}>`,
        to: review.clientEmail,
        subject: 'Thank You for Your Submission — Hogan Guards',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #B5253C; border-radius: 10px; max-width: 600px;">
                <h2 style="color: #113C63; margin-top: 0;">Thank You, ${escapeHtml(review.clientName)}!</h2>
                <hr style="border: 0; border-top: 2px solid #B5253C; margin-bottom: 20px;">

                <p>We've received your onboarding details and will proceed with deploying your security guards as scheduled.</p>

                <p>Our team will be in touch if any further information is needed ahead of the deployment date.</p>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #777;">Hogan Guards Client Onboarding Portal</p>
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
