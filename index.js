require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 4001;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});


const authRoutes = require('./src/auth/auth');
const assessmentRoutes = require('./src/assesment/router');
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// CORS middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add JSON body parser middleware
app.use(express.json());


// Handle preflight requests
app.options('*', (req, res) => {
    res.sendStatus(200);
});

// Import auth routes

app.use('/auth', (req, res, next) => {
    console.log(`Request made to /auth${req.path} with method ${req.method}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    next();
}, authRoutes);

// Add assessment routes
app.use('/assessment', assessmentRoutes);

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error stack trace:', err.stack);
    res.status(500).json({ 
        message: 'Internal Server Error',
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});