// One-time script to create the initial admin accounts.
// Safe to re-run — skips any email that already has an account.
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');

const INITIAL_ADMINS = [
    { name: 'Kehinde', email: 'kehinde@thehoganorganization.com' },
    { name: 'Adrienne Adeshina', email: 'bolaji.adeshina@hoganguards.com' },
    { name: 'Samuel Imoru', email: 'samuelimoru@thehoganorganization.com' },
    { name: 'Toyin', email: 'toyin@thehoganorganization.com' },
    { name: 'Ayo', email: 'i.tsupport@hogantechno.com' }
];

function generatePassword() {
    return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '');
}

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set in .env');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.\n');

    const created = [];

    for (const admin of INITIAL_ADMINS) {
        const existing = await AdminUser.findOne({ email: admin.email.toLowerCase() });
        if (existing) {
            console.log(`Skipping ${admin.email} — account already exists.`);
            continue;
        }

        const password = generatePassword();
        const passwordHash = await AdminUser.hashPassword(password);
        await AdminUser.create({ name: admin.name, email: admin.email, passwordHash });
        created.push({ ...admin, password });
    }

    if (created.length > 0) {
        console.log('\n=== New accounts created — share each password with its owner, then delete this output ===\n');
        created.forEach(a => {
            console.log(`${a.name} <${a.email}>`);
            console.log(`  Temporary password: ${a.password}\n`);
        });
        console.log('Each person should change their password after first login (Change Password button in the dashboard).');
    } else {
        console.log('\nNo new accounts needed — all admins already exist.');
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
