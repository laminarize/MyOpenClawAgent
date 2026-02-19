const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Contact form validation
const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
];

// Create transporter from env vars
function createTransporter() {
    const smtpConfig = process.env.GOOG_SMTP;
    
    if (!smtpConfig) {
        throw new Error('SMTP not configured');
    }
    
    // Format: user:pass
    const [user, pass] = smtpConfig.split(':');
    
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: user,
            pass: pass
        }
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
        
        // Get transporter
        let transporter;
        try {
            transporter = createTransporter();
        } catch (err) {
            console.error('SMTP config error:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Email service not configured'
            });
        }
        
        // Send email
        await transporter.sendMail({
            from: '"MyOpenClawAgent Website" <laminarize@gmail.com>',
            to: 'josh@myopenclawagent.com',
            replyTo: email,
            subject: `Contact Form: ${name}`,
            text: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        });
        
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
