"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-medsseva-key';
const register = async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { mobile },
                    { email: email || undefined }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this mobile or email already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                mobile,
                password: hashedPassword
            }
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({
            message: 'Registration successful',
            user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email },
            token
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register', details: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { mobile, password } = req.body;
        console.log(`🔑 Login Attempt: Mobile=${mobile}`);
        let user = await prisma.user.findUnique({ where: { mobile } });
        let isNewUser = false;
        if (!user) {
            console.log(`✨ New User Detected! Auto-registering mobile=${mobile}...`);
            // Hash the entered password so it becomes their permanent login password
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    name: `User ${mobile.slice(-4)}`,
                    email: `${mobile}@medsseva.com`,
                    mobile,
                    password: hashedPassword
                }
            });
            isNewUser = true;
            console.log(`✅ Auto-registration successful for user ID: ${user.id}`);
        }
        else {
            if (!user.password) {
                console.log('❌ User has no password set');
                return res.status(401).json({ error: 'Invalid mobile number or password' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.password);
            if (!isMatch) {
                console.log('❌ Password mismatch');
                return res.status(401).json({ error: 'Invalid mobile number or password' });
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            message: isNewUser ? 'Auto-registration & Login successful' : 'Login successful',
            user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email },
            token,
            isNewUser
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login', details: error.message });
    }
};
exports.login = login;
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching registered users:', error);
        res.status(500).json({ error: 'Failed to fetch registered users', details: error.message });
    }
};
exports.getAllUsers = getAllUsers;
