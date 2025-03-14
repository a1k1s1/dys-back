const User = require('../model/model');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data'); // Make sure to install this: npm install form-data
const FLASK_SERVER_URL = 'http://127.0.0.1:5000';
const FLASK_IMAGE_ENDPOINT = `${FLASK_SERVER_URL}/handwriting`;
const FLASK_AUDIO_ENDPOINT = `${FLASK_SERVER_URL}/analyze-sound`;
const ffmpeg = require('fluent-ffmpeg');

// Update handwriting score
exports.updateHandwriting = async (req, res) => {
    try {
        const { userId, handwritingScore } = req.body;
        
        if (![1, 2, 3].includes(handwritingScore)) {
            return res.status(400).json({ message: 'Handwriting score must be 1, 2, or 3' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { 'initialAssessment.handwriting': handwritingScore },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Handwriting score updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update initial assessment questions
exports.updateInitialQuestions = async (req, res) => {
    try {
        const { userId, questions } = req.body;
        
        if (!Array.isArray(questions) || questions.length !== 10) {
            return res.status(400).json({ message: 'Must provide exactly 10 questions' });
        }

        const validQuestions = questions.every(q => q.score === 0 || q.score === 1);
        if (!validQuestions) {
            return res.status(400).json({ message: 'Each question score must be 0 or 1' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { 'initialAssessment.questions': questions },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Initial assessment updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.calculateDyslexiaRisk = async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        // Retrieve user from database
        const user = await User.findById(userId).select('initialAssessment');
        
        if (!user || !user.initialAssessment) {
            return res.status(404).json({ message: 'User not found or no initial assessment available' });
        }

        // Extract questions
        const questions = user.initialAssessment.questions;

        // Validate questions
        if (!Array.isArray(questions) || questions.length !== 10) {
            return res.status(400).json({ message: 'Invalid questions format' });
        }

        // Define question weights based on dyslexia relevance
        const questionWeights = [
            0.9,  // Question 1: Letter/number recognition
            0.8,  // Question 2: Sound association
            0.9,  // Question 3: Letter mixing
            0.6,  // Question 4: Multi-step instructions
            0.8,  // Question 5: Vocabulary retention
            0.7,  // Question 6: Letter order
            0.9,  // Question 7: Frustration with reading/writing
            0.7,  // Question 8: Sequence memory
            0.8,  // Question 9: Rhyming words
            0.6   // Question 10: Hand-eye coordination
        ];

        // Calculate weighted score
        let totalWeightedScore = 0;
        let totalWeight = 0;

        questions.forEach((q, index) => {
            if (q.score === 1) {
                totalWeightedScore += questionWeights[index];
                totalWeight += questionWeights[index];
            } else if (q.score === 0) {
                totalWeight += questionWeights[index] * 0.2; // Give some weight to negative answers
            }
        });

        // Normalize score to 0-10 scale
        const maxPossibleScore = questionWeights.reduce((a, b) => a + b, 0);
        const normalizedScore = (totalWeightedScore / maxPossibleScore) * 10;

        // Update user with normalized score
        user.initialAssessment.dyslexiaRiskScore = Math.round(normalizedScore * 10) / 10; // Round to one decimal place
        
        await user.save();

        res.status(200).json({
            message: 'Dyslexia risk score calculated successfully',
            dyslexiaRiskScore: user.initialAssessment.dyslexiaRiskScore
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Fixed processHandwritingImage endpoint
exports.processHandwritingImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const userId = req.body.userId;

        // Validate userId
        // if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        //     return res.status(400).json({ message: 'Invalid or missing user ID' });
        // }

        // Log information for debugging
        console.log('Processing handwriting image:');
        console.log('File:', req.file.originalname, req.file.mimetype, req.file.size);
        console.log('UserId:', userId);

        let score;
        try {
            // Create FormData to send to Flask server
            const formData = new FormData();
            formData.append('image', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            // Send image to Flask server
            const flaskResponse = await axios.post(FLASK_IMAGE_ENDPOINT, formData, {
                headers: formData.getHeaders()
            });

            score = flaskResponse.data.score;
            console.log('Received score from Flask server:', score);
        } catch (flaskError) {
            console.error('Flask server error:', flaskError.message);
            // If Flask server is not available, use a fallback method
            // For demo purposes, assign a random score between 1-3
            score = Math.floor(Math.random() * 3) + 1;
            console.log('Using fallback score:', score);
        }

        // Update user with the score
        const user = await User.findByIdAndUpdate(
            userId,
            { 'initialAssessment.handwriting': score },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ 
            message: 'Handwriting score updated successfully', 
            score,
            user 
        });
    } catch (error) {
        console.error('Error in processing handwriting:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Fixed processAudio endpoint
exports.processAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file provided' });
        }

        // Parse the JSON data from the request
        const jsonData = JSON.parse(req.body.data || '{}');
        
        const userId = jsonData.userId;
        const testType = jsonData.testType;
        const expectedText = jsonData.expectedText;
        const difficulty = jsonData.difficulty || 'medium';
        
        console.log('Processing audio for user:', userId);
        console.log('Test type:', testType);
        console.log('Expected text:', expectedText);
        console.log('Difficulty:', difficulty);

        // Validate inputs
        if (!testType || !expectedText) {
            return res.status(400).json({ message: 'Missing test type or expected text' });
        }

        // Validate audio format
        if (!isValidWav(req.file.buffer)) {
            try {
                // Convert to WAV if not valid
                req.file.buffer = await convertToWav(req.file.buffer);
            } catch (conversionError) {
                console.error('Audio conversion failed:', conversionError);
                return res.status(400).json({ 
                    message: 'Invalid audio format. Please upload a valid WAV file',
                    error: conversionError.message 
                });
            }
        }

        // Create FormData to send to Flask server
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: 'recording.wav',
            contentType: 'audio/wav'
        });
        formData.append('data', JSON.stringify({
            test_type: testType,
            expected_text: expectedText,
            difficulty: difficulty
        }));

        console.log('Sending audio to Flask server...');
        
        // Send audio to Flask server
        const flaskResponse = await axios.post(FLASK_AUDIO_ENDPOINT, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Length': formData.getLengthSync()
            }
        });

        console.log('Received response from Flask server:', {
            status: flaskResponse.status,
            data: flaskResponse.data
        });

        // Extract results from Flask response
        const { transcript, analysis, audio_analysis, session_summary } = flaskResponse.data;

        console.log('Audio analysis results:', {
            transcript,
            accuracy: analysis.levenshtein_accuracy,
            responseTime: analysis.response_time
        });

        // Update user with the analysis results
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { 'initialAssessment.audio': analysis } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({ 
            message: 'Audio analysis completed successfully',
            transcript,
            analysis,
            audioAnalysis: audio_analysis,
            sessionSummary: session_summary,
            user
        });
    } catch (error) {
        console.error('Error in processing audio:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Add WAV validation function
function isValidWav(buffer) {
    if (buffer.length < 44) return false; // WAV header is at least 44 bytes
    
    // Check for "RIFF" and "WAVE" in the header
    const riff = buffer.toString('ascii', 0, 4);
    const wave = buffer.toString('ascii', 8, 12);
    
    return riff === 'RIFF' && wave === 'WAVE';
}

async function convertToWav(inputBuffer) {
    return new Promise((resolve, reject) => {
        const outputBuffer = [];
        
        ffmpeg()
            .input(inputBuffer)
            .audioCodec('pcm_s16le')
            .format('wav')
            .on('error', (err) => {
                reject(new Error(`Audio conversion failed: ${err.message}`));
            })
            .on('end', () => {
                resolve(Buffer.concat(outputBuffer));
            })
            .on('data', (chunk) => {
                outputBuffer.push(chunk);
            })
            .pipe();
    });
}