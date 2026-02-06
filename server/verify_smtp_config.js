import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const password = process.env.SMTP_PASS;
const host = process.env.SMTP_HOST;
const users = ['sistemas', 'sistemas@cge.mil.ar'];

const configs = [
    { port: 587, secure: false, name: '587 - STARTTLS' },
    { port: 465, secure: true, name: '465 - SSL' },
    { port: 25, secure: false, name: '25 - Unsecure' },
    { port: 587, secure: false, tls: { rejectUnauthorized: false }, name: '587 - STARTTLS (Insecure Cert)' },
    { port: 465, secure: true, tls: { rejectUnauthorized: false }, name: '465 - SSL (Insecure Cert)' },
];

async function testConfig(user, config) {
    const transporter = nodemailer.createTransport({
        host,
        port: config.port,
        secure: config.secure,
        auth: { user, pass: password },
        tls: config.tls
    });

    try {
        await transporter.verify();
        console.log(`✅ SUCCESS: User: ${user} | Config: ${config.name}`);
        return true;
    } catch (error) {
        console.log(`❌ FAILED: User: ${user} | Config: ${config.name} | Error: ${error.response || error.code}`);
        return false;
    }
}

async function runTests() {
    console.log(`Testing SMTP Host: ${host} with Password: ${password ? '****' : 'MISSING'}`);

    for (const user of users) {
        console.log(`\n--- Testing User: ${user} ---`);
        for (const config of configs) {
            await testConfig(user, config);
        }
    }
}

runTests();
