import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root is one level up from server (where this script will likely be run) or just current dir if run from root
// Let's assume we run it from root for simplicity, or handle path.

const envPath = path.resolve('.env');

// Read existing .env
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (err) {
    console.log('ℹ️ No .env found, creating new one.');
}

// Config to add/update
const emailConfig = {
    SMTP_HOST: 'mail.cge.mil.ar',
    SMTP_PORT: '587',
    SMTP_USER: 'sistemas@cge.mil.ar',
    SMTP_PASS: 'S0p0rt3.2050',
    SMTP_SECURE: 'false',
    SMTP_FROM: 'notificaciones@cge.mil.ar'
};

let newEnvContent = envContent;

Object.entries(emailConfig).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (newEnvContent.match(regex)) {
        newEnvContent = newEnvContent.replace(regex, `${key}=${value}`);
    } else {
        newEnvContent += `\n${key}=${value}`;
    }
});

fs.writeFileSync(envPath, newEnvContent.trim() + '\n');
console.log('✅ .env updated with working Email Configuration.');
