const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['parent', 'teacher', 'student']
    },
    // For students only
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // For students only
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('User', userSchema);
