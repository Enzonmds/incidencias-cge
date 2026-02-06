import ActiveDirectory from 'activedirectory2';
import dotenv from 'dotenv';
dotenv.config();

// Allow manual override via CLI args: node test_ad_connection.js <user> <pass>
const cliUser = process.argv[2];
const cliPass = process.argv[3];

const config = {
    url: process.env.AD_URL,
    baseDN: process.env.AD_BASE_DN,
    username: cliUser || process.env.AD_USER,
    password: cliPass || process.env.AD_PASS,
    tlsOptions: { rejectUnauthorized: false }
};

console.log('🔌 Connecting to AD:', config.url);
console.log('📂 BaseDN:', config.baseDN);
console.log('👤 User:', config.username);

// Create AD instance
const ad = new ActiveDirectory(config);
const usernameToTest = config.username;
const passwordToTest = config.password;

console.log(`🔑 Attempting authentication for: ${usernameToTest}`);

// Helper function to try auth formats
const tryAuth = (principal) => {
    return new Promise((resolve) => {
        console.log(`\n⏳ Trying format: "${principal}"...`);
        ad.authenticate(principal, passwordToTest, (err, auth) => {
            if (err) {
                // Check if it's invalid credentials
                const errStr = JSON.stringify(err);
                console.log(`❌ Failed: ${errStr.includes('52e') ? 'Invalid Credentials (52e)' : err.message}`);
                resolve(false);
            } else {
                console.log('✅ Success! Authenticated!');
                resolve(true);
            }
        });
    });
};

(async () => {
    // 1. Try Username only
    let success = await tryAuth(usernameToTest);

    // 2. Try User@Domain
    if (!success) {
        success = await tryAuth(`${usernameToTest}@ea.mil.ar`);
    }

    // 3. Try EA.MIL.AR\User (User Request)
    if (!success) {
        success = await tryAuth(`EA.MIL.AR\\${usernameToTest}`);
    }

    // 4. Try Domain\User (Short)
    if (!success) {
        success = await tryAuth(`EA\\${usernameToTest}`);
    }

    // 5. Try Constructed DN (Last Resort)
    if (!success) {
        const dn = `CN=${usernameToTest},${config.baseDN}`;
        success = await tryAuth(dn);
    }

    if (success) {
        console.log('\n🎉 Authentication verified via one of the formats.');
        console.log('🔍 Testing User Query...');
        ad.findUser(usernameToTest, (err, user) => {
            if (err) console.log('❌ Query Error:', err);
            else {
                if (user) console.log('✅ User Query Success:', JSON.stringify(user, null, 2));
                else console.log('⚠️ Authentication worked, but Query returned no user (Permissions issue?).');
            }
        });
    } else {
        console.error('\n🚫 All authentication formats failed.');
    }
})();
