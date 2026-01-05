import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import nodemailer from 'nodemailer';

const configurations = [
    {
        name: 'Port 587 (STARTTLS)',
        config: {
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false, // upgrades later with STARTTLS
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        }
    },
    {
        name: 'Port 465 (SSL/TLS)',
        config: {
            host: process.env.SMTP_HOST,
            port: 465,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        }
    },
    {
        name: 'Port 25 (Unsecure/STARTTLS)',
        config: {
            host: process.env.SMTP_HOST,
            port: 25,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        }
    },
    {
        name: 'Port 587 (Ignore Certs)',
        config: {
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
        }
    },
    {
        name: 'Port 465 (Ignore Certs)',
        config: {
            host: process.env.SMTP_HOST,
            port: 465,
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            tls: { rejectUnauthorized: false }
        }
    }
];

const testConfig = async (configData) => {
    console.log(`\n🔄 Testing: ${configData.name}...`);
    const transporter = nodemailer.createTransport(configData.config);
    try {
        await transporter.verify();
        console.log(`✅ SUCCESS: ${configData.name} Connected!`);

        // Try sending
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: 'enzonmds@gmail.com', // Creating a hardcoded test recipient as requested
            subject: 'Test Diagnostic CGE',
            text: `Working config: ${configData.name}`
        });
        console.log(`📨 Email sent successfully! MessageID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.log(`❌ FAILED: ${configData.name}`);
        console.log(`   Error: ${error.message}`);
        if (error.code) console.log(`   Code: ${error.code}`);
        return false;
    }
};

const runDiagnostics = async () => {
    console.log('🕵️‍♀️ Starting SMTP Diagnostics for host:', process.env.SMTP_HOST);
    console.log('User:', process.env.SMTP_USER);

    for (const config of configurations) {
        const success = await testConfig(config);
        if (success) {
            console.log('\n🎉 Found a working configuration!');
            console.log('------------------------------------------------');
            console.log(JSON.stringify(config.config, null, 2));
            console.log('------------------------------------------------');
            break; // Stop after first success
        }
    }
    console.log('\n🏁 Diagnostics Complete.');
};

runDiagnostics();
