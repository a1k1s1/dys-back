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
    initialAssessment: {
        type: {
            questions: {
                type: [{
                    score: {
                        type: Number,
                        min: 0,
                        max: 1
                    }
                }],
                validate: [array => array.length === 10, 'Must have exactly 10 questions']
            },
            handwriting: {
                type: Number,
                enum: [1, 2, 3]
            },
            adaptiveLearning: {
                letter: {
                    easy: { type: Number, min: 0, max: 1, default: 0.8 },
                    medium: { type: Number, min: 0, max: 1, default: 0.5 },
                    hard: { type: Number, min: 0, max: 1, default: 0.2 }
                },
                words: {
                    easy: { type: Number, min: 0, max: 1, default: 0.7 },
                    medium: { type: Number, min: 0, max: 1, default: 0.4 },
                    hard: { type: Number, min: 0, max: 1, default: 0.1 }
                },
                complexWords: {
                    easy: { type: Number, min: 0, max: 1, default: 0.6 },
                    medium: { type: Number, min: 0, max: 1, default: 0.3 },
                    hard: { type: Number, min: 0, max: 1, default: 0.1 }
                },
                sentence: {
                    easy: { type: Number, min: 0, max: 1, default: 0.5 },
                    medium: { type: Number, min: 0, max: 1, default: 0.3 },
                    hard: { type: Number, min: 0, max: 1, default: 0.1 }
                },
                complexSentence: {
                    easy: { type: Number, min: 0, max: 1, default: 0.4 },
                    medium: { type: Number, min: 0, max: 1, default: 0.2 },
                    hard: { type: Number, min: 0, max: 1, default: 0.1 }
                }
            }
        },
        required: function() {
            return this.role === 'student';
        }
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
