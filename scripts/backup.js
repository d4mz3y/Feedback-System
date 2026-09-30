// Daily backup: dumps all submissions to a local JSON file and emails a
// copy off-box for redundancy. Run via cron — see deploy/README.md.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Feedback = require('../models/Feedback');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 30;

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set — nothing to back up.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const submissions = await Feedback.find().sort({ timestamp: 1 });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backup-${dateStr}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(submissions, null, 2));
    console.log(`Wrote ${submissions.length} submissions to ${filepath}`);

    await emailBackup(filepath, filename, submissions.length);
    rotateOldBackups();

    await mongoose.disconnect();
}

async function emailBackup(filepath, filename, count) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not set — skipping off-box copy.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.dreamhost.com',
        port: 465,
        secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
        from: `"Hogan Guards Backups" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `Daily backup — ${count} submissions — ${new Date().toISOString().slice(0, 10)}`,
        text: `Attached: a full export of all client onboarding submissions as of this backup run.`,
        attachments: [{ filename, path: filepath }]
    });

    console.log('Backup emailed successfully.');
}

function rotateOldBackups() {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of fs.readdirSync(BACKUP_DIR)) {
        const filepath = path.join(BACKUP_DIR, file);
        if (fs.statSync(filepath).mtimeMs < cutoff) {
            fs.unlinkSync(filepath);
            console.log(`Removed old backup: ${file}`);
        }
    }
}

main().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
});
