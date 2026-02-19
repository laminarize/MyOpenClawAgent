const express = require('express');
const { body, validationResult } = require('express-validator');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const router = express.Router();

// Contact form validation
const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
];

// Send contact email via gog
async function sendContactEmail(name, email, message) {
    const subject = encodeURIComponent(`Contact Form: ${name}`);
    const fullBody = `New contact form submission:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const bodyEncoded = encodeURIComponent(fullBody);
    
    // Use gog to send email
    const gogPath = '/home/linuxbrew/.linuxbrew/bin/gog';
    const cmd = `${gogPath} gmail send --to josh@myopenclawagent.com --subject "${subject}" --body-file - --account laminarize@gmail.com`;
    
    // Use child_process with stdin
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
        const process = spawn('/bin/sh', ['-c', cmd], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });
        
        // Write the body to stdin
        process.stdin.write(fullBody);
        process.stdin.end();
    });
}

// Contact form endpoint
router.post('/contact', contactValidation, async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        
        const { name, email, message } = req.body;
        
        // Send email via gog
        await sendContactEmail(name, email, message);
        
        res.json({
            success: true,
            message: 'Message sent successfully!'
        });
        
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try again.'
        });
    }
});

module.exports = router;
