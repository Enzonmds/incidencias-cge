import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import axios from 'axios';
import { Op } from 'sequelize'; // Added Op
import { User } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Allow login by Email OR DNI
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { dni: email } // Frontend sends input in 'email' field
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, department: user.department },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const verifyWhatsApp = async (req, res) => {
    try {
        const { whatsappToken, userId } = req.body; // userId comes from the authenticated session (authMiddleware)

        // 1. Verify the Magic Link Token
        // This token contains the phone number and is signed
        const decoded = jwt.verify(whatsappToken, process.env.JWT_SECRET);
        const { phone, guestId, targetUserId } = decoded;

        if (!phone) {
            return res.status(400).json({ message: 'Invalid token payload' });
        }

        // Security Check: Ensure Logged In User matches Expected User (DNI)
        // targetUserId comes from DNI lookup in webhook
        if (targetUserId && String(targetUserId) !== String(userId)) {
            const targetUser = await User.findByPk(targetUserId);
            const currentUser = await User.findByPk(userId);

            return res.status(403).json({
                message: `⚠️ Error de Validación:\n\nEste enlace fue generado para el usuario ${targetUser ? targetUser.name : 'Otro'}.\n\nActualmente estás logueado como ${currentUser ? currentUser.name : 'Usuario'}.\n\nPor favor, cierra sesión e ingresa con la cuenta correcta.`
            });
        }

        console.log(`🔗 Linking Phone ${phone} to User ID ${userId}`);

        // 2. Find the Real User
        const realUser = await User.findByPk(userId);
        if (!realUser) return res.status(404).json({ message: 'User not found' });

        // 3. Find the Guest User (if exists)
        const guestUser = await User.findOne({ where: { phone: phone, whatsapp_step: 'WAITING_LOGIN' } });

        // 4. Update Real User
        if (realUser.phone === phone) {
            console.log(`ℹ️ Phone verified again (Idempotent success)`);
            return res.json({ success: true, message: 'Identity already verified' });
        }

        realUser.phone = phone;
        // If they were previously stuck, clear it
        realUser.whatsapp_step = 'WAITING_TOPIC'; // Ask for topic after verify
        await realUser.save();

        // 5. Cleanup Guest User (if it was a temp one)
        if (guestUser && guestUser.id !== realUser.id) {
            // Re-assign any tickets/messages from guest to real user?
            // For now, let's just delete the guest to avoid dupes, assuming they haven't done much yet
            await guestUser.destroy();
        }

        // 6. Notify via WhatsApp
        await sendWhatsAppMessage(phone, `✅ Cuenta vinculada exitosamente. Hola ${realUser.name}.\n\nPor favor, seleccione el tema de su consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres`);

        res.json({ success: true, message: 'Identity verified successfully' });

    } catch (error) {
        console.error('WhatsApp Verification Error:', error);
        res.status(400).json({ message: 'Invalid or expired token' });
    }
};


// Setup Password (for Invited Users)
export const setupPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and Password required' });
        }

        // Verify Token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        if (decoded.purpose !== 'invite') {
            return res.status(400).json({ message: 'Invalid token purpose' });
        }

        const user = await User.findByPk(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 10);
        user.password_hash = passwordHash;
        await user.save();

        res.json({ success: true, message: 'Password set successfully' });

    } catch (error) {
        console.error('Setup Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
