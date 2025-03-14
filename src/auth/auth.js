const express = require('express');
const router = express.Router();
const User = require('../model/model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Sign-in endpoint
router.post('/signin', async (req, res) => {
    console.log("Sign-in request received");
    try {
        const { email, password } = req.body;
        console.log(`Attempting sign-in for email: ${email}`);
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User not found for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Password mismatch for user: ${user._id}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log(`Successful sign-in for user: ${user._id}, role: ${user.role}`);
        res.json({ token, userId: user._id, role: user.role });
    } catch (error) {
        console.error('Sign-in error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Sign-out endpoint (client-side should remove token)
router.post('/signout', (req, res) => {
    res.json({ message: 'Sign out successful' });
});

// Sign-up endpoint
router.post('/signup', async (req, res) => {
    console.log("enter")
    try {
        // Destructure all required fields including name
        const { name, email, password, role } = req.body;
        console.log('Signup request received:', { name, email, role });

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user with all required fields
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user' // Default to 'user' role if not specified
        });

        await newUser.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
