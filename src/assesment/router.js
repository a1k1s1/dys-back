const express = require('express');
const router = express.Router();
const assessmentController = require('./assesment');
const multer = require('multer');

// Configure multer storage
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Update initial assessment questions
router.post('/initial-questions', assessmentController.updateInitialQuestions);

// Calculate dyslexia risk score
router.post('/calculate-risk', assessmentController.calculateDyslexiaRisk);

// Process handwriting image - fixed route handler
router.post('/handwriting', upload.single('image'), assessmentController.processHandwritingImage);

// Process audio - fixed route handler  
router.post('/audio', upload.single('file'), (req, res, next) => {
  console.log('Audio route hit!');
  console.log('Request body:', req.body);
  console.log('File received:', req.file);
  console.log('Headers:', req.headers);
  
  // Add error handling
  if (!req.file) {
    console.error('No file received in request');
    return res.status(400).json({ error: 'No file received' });
  }
  
  assessmentController.processAudio(req, res, next);
});

module.exports = router;