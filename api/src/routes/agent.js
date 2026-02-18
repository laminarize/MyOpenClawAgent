const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validationRules, handleValidation } = require('../middleware/security');
const { agentManager } = require('../services/agentManager');

const router = express.Router();

// List available agent types
router.get('/types', (req, res) => {
    res.json({
        types: [
            {
                id: 'chat',
                name: 'Chat Agent',
                description: 'General conversation agent'
            },
            {
                id: 'coding',
                name: 'Coding Agent',
                description: 'Software development assistant'
            },
            {
                id: 'research',
                name: 'Research Agent',
                description: 'Web research and analysis'
            }
        ]
    });
});

// Spawn new agent
router.post('/spawn', validationRules.agent, handleValidation, async (req, res) => {
    try {
        const { type = 'chat', config = {} } = req.body;
        const clientIp = req.clientInfo?.ip || req.ip;
        
        // Create new agent
        const agent = await agentManager.spawn({
            type,
            config: {
                ...config,
                clientIp,
                createdAt: new Date().toISOString()
            }
        });
        
        res.status(201).json({
            agentId: agent.id,
            type: agent.type,
            status: agent.status,
            createdAt: agent.createdAt
        });
    } catch (error) {
        console.error('Spawn error:', error);
        res.status(500).json({ error: 'Failed to spawn agent' });
    }
});

// Get agent status
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await agentManager.get(id);
        
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        res.json({
            agentId: agent.id,
            type: agent.type,
            status: agent.status,
            createdAt: agent.createdAt,
            lastActivity: agent.lastActivity
        });
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: 'Failed to get agent status' });
    }
});

// Terminate agent
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await agentManager.terminate(id);
        
        res.json({ success: true, message: 'Agent terminated' });
    } catch (error) {
        if (error.message === 'Agent not found') {
            return res.status(404).json({ error: 'Agent not found' });
        }
        console.error('Terminate error:', error);
        res.status(500).json({ error: 'Failed to terminate agent' });
    }
});

// List active agents (admin)
router.get('/', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ADMIN_KEY) {
            // Return limited info for non-admin
            return res.json({ 
                count: await agentManager.count(),
                message: 'Provide admin key for details'
            });
        }
        
        const agents = await agentManager.list();
        
        res.json({
            agents: agents.map(a => ({
                agentId: a.id,
                type: a.type,
                status: a.status,
                createdAt: a.createdAt,
                clientIp: a.clientIp
            })),
            total: agents.length
        });
    } catch (error) {
        console.error('List agents error:', error);
        res.status(500).json({ error: 'Failed to list agents' });
    }
});

module.exports = router;
