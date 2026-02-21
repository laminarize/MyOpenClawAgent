const express = require('express');
const { Resend } = require('resend');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Character limits
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 250;

// Contact form validation
const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
];

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY not configured');
    }
    return new Resend(apiKey);
}

// Contact form endpoint (POST /api/v1/contact)
router.post('/', contactValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, email, message } = req.body;

        // Validate character limits (block direct API calls circumventing frontend)
        if (name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
            console.error('Character limit violation:', { nameLen: name.length, emailLen: email.length, messageLen: message.length });
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }

        // Get Resend client
        let resend;
        try {
            resend = getResend();
        } catch (err) {
            console.error('Contact form: Resend not configured. Set RESEND_API_KEY in .env', err.message);
            return res.status(503).json({
                success: false,
                error: 'Email service not configured. Please try again later.'
            });
        }

        // Respond to client immediately; send email in background
        res.json({ success: true, message: 'Message sent successfully!' });

        resend.emails.send({
            from: 'help@myopenclawagent.com',
            to: 'laminarize@gmail.com',
            replyTo: email,
            subject: 'NEW WEB CONTACT',
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `,
            text: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        }).then((result) => {
            if (result.error) {
                console.error('Contact form send error:', result.error);
            } else {
                console.log('Contact form email sent, id:', result.data?.id);
            }
        }).catch((err) => {
            console.error('Contact form send error (background):', err.message);
        });

    } catch (error) {
        console.error('Contact form error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to send message. Please try again.' });
    }
});

module.exports = router;
