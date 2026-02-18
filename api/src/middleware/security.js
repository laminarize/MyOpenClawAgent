const { body, query, param, validationResult } = require('express-validator');

// Security middleware
const securityMiddleware = (req, res, next) => {
    // Remove sensitive headers from being forwarded
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Set security-related headers
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize string inputs
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Remove null bytes and trim
                req.body[key] = req.body[key].replace(/\0/g, '').trim();
            }
        }
    }
    next();
};

// Validation result handler
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({
                field: e.path,
                message: e.msg
            }))
        });
    }
    next();
};

// Common validation rules
const validationRules = {
    chat: [
        body('message')
            .trim()
            .notEmpty()
            .withMessage('Message is required')
            .isLength({ max: 10000 })
            .withMessage('Message too long'),
        body('sessionId')
            .optional()
            .isUUID(4)
            .withMessage('Invalid session ID')
    ],
    agent: [
        body('type')
            .optional()
            .isIn(['chat', 'coding', 'research'])
            .withMessage('Invalid agent type'),
        body('config')
            .optional()
            .isObject()
            .withMessage('Config must be an object')
    ],
    session: [
        param('id')
            .isUUID(4)
            .withMessage('Invalid session ID')
    ]
};

module.exports = { 
    securityMiddleware, 
    sanitizeInput, 
    handleValidation,
    validationRules 
};
