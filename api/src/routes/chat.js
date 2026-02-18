const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validationRules, handleValidation } = require('../middleware/security');
const { sessionStore } = require('../services/sessionStore');

const router = express.Router();

// Send message to agent
router.post('/', validationRules.chat, handleValidation, async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const clientIp = req.clientInfo?.ip || req.ip;
        
        // Get or create session
        let session = sessionId 
            ? await sessionStore.get(sessionId)
            : null;
            
        if (!session) {
            session = {
                id: uuidv4(),
                createdAt: new Date().toISOString(),
                messages: [],
                clientIp
            };
            await sessionStore.set(session.id, session);
        }
        
        // Add user message
        const userMessage = {
            id: uuidv4(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        session.messages.push(userMessage);
        
        // In production, this would call OpenClaw API
        // For now, return a placeholder response
        const assistantMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: `Received your message: "${message}". This is a placeholder response. The OpenClaw integration would process your message here.`,
            timestamp: new Date().toISOString()
        };
        session.messages.push(assistantMessage);
        
        // Save updated session
        await sessionStore.set(session.id, session);
        
        res.json({
            sessionId: session.id,
            message: assistantMessage,
            session: {
                id: session.id,
                messageCount: session.messages.length
            }
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Stream chat responses (WebSocket)
router.get('/stream/:sessionId', validationRules.session, handleValidation, (req, res) => {
    // This endpoint is handled by WebSocket server
    // Returning 400 to indicate WebSocket should be used
    res.status(400).json({ 
        error: 'Use WebSocket connection at /ws for streaming' 
    });
});

// Get chat history
router.get('/history/:sessionId', validationRules.session, handleValidation, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await sessionStore.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            sessionId: session.id,
            messages: session.messages,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to retrieve history' });
    }
});

// Delete session
router.delete('/session/:sessionId', validationRules.session, handleValidation, async (req, res) => {
    try {
        const { sessionId } = req.params;
        await sessionStore.delete(sessionId);
        
        res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

module.exports = router;
