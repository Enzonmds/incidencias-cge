import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

export const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const whereClause = role ? { role } : {};

        const users = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password_hash'] }
        });
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Need to import jwt and email service
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/emailService.js';

export const createUser = async (req, res) => {
    try {
        const { name, email, role, password } = req.body; // Password might be empty now

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // If password provided (e.g. Admin sets it manually), hash it. If not, use null (Invited)
        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const newUser = await User.create({
            name,
            dni: req.body.dni || null,
            email,
            password_hash: passwordHash,
            role: role || 'USER'
        });

        // If no password was set, send Invitation Email
        if (!password) {
            const inviteToken = jwt.sign(
                { id: newUser.id, email: newUser.email, purpose: 'invite' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Use FRONTEND_URL or Fallback for link
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const setupLink = `${frontendUrl}/setup-password?token=${inviteToken}`;

            const emailSubject = 'Bienvenido a Ticketera CGE - Configure su Contraseña';
            const emailHtml = `
                <h2>Bienvenido/a ${newUser.name}</h2>
                <p>Se ha creado su cuenta en el sistema de Incidencias CGE.</p>
                <p>Para activar su cuenta y definir su contraseña, haga clic en el siguiente enlace:</p>
                <a href="${setupLink}" style="padding: 10px 20px; background-color: #004d40; color: white; text-decoration: none; border-radius: 5px;">Definir Contraseña</a>
                <p><small>Este enlace expira en 24 horas.</small></p>
            `;

            // Non-blocking email send
            sendEmail({ to: email, subject: emailSubject, html: emailHtml }).catch(console.error);
        }

        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            message: password ? 'User created' : 'User invited. Email sent.'
        });
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdUsers = async (req, res) => {
    // Mock data representing what we would get from Active Directory / LDAP
    const adUsers = [
        { id: 101, name: 'Capitán Gutierrez', email: 'jgutierrez@ejercito.mil.ar', unit: 'Regimiento de Infantería 1', status: 'SYNCED' },
        { id: 102, name: 'Sargento Mendez', email: 'mmendez@ejercito.mil.ar', unit: 'Batallón Logístico', status: 'SYNCED' },
        { id: 103, name: 'Suboficial Perez', email: 'pperez@ejercito.mil.ar', unit: 'Comando de Personal', status: 'SYNCED' },
    ];
    res.json(adUsers);
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, department, phone, name, email } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields if provided
        if (role) user.role = role;
        if (department !== undefined) user.department = department; // Allow clearing with null
        if (phone) user.phone = phone;
        if (name) user.name = name;
        if (email) user.email = email;

        await user.save();

        res.json({
            message: 'User updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const inviteToken = jwt.sign(
            { id: user.id, email: user.email, purpose: 'invite' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const setupLink = `${frontendUrl}/setup-password?token=${inviteToken}`;

        const emailSubject = 'Restablecer Contraseña - Ticketera CGE';
        const emailHtml = `
            <h2>Hola ${user.name},</h2>
            <p>Se ha solicitado el restablecimiento de su contraseña.</p>
            <p>Haga clic en el siguiente enlace para definir una nueva clave:</p>
            <a href="${setupLink}" style="padding: 10px 20px; background-color: #004d40; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
            <p><small>Este enlace expira en 24 horas.</small></p>
        `;

        await sendEmail({ to: user.email, subject: emailSubject, html: emailHtml });

        res.json({ message: 'Email de restablecimiento enviado.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'ADMIN') {
            return res.status(403).json({ message: 'Cannot delete Admin users via API' });
        }

        await user.destroy();
        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
