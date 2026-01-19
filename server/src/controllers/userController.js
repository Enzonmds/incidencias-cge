import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password_hash'] }
        });
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            dni: req.body.dni || null, // Accept DNI
            email,
            password_hash: passwordHash,
            role: role || 'USER'
        });

        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
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
