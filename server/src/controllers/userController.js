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
