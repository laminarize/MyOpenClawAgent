const { v4: uuidv4 } = require('uuid');

// Agent Manager - handles spawning and managing agent instances

class AgentManager {
    constructor() {
        this.agents = new Map();
        this.AGENT_TTL = 60 * 60 * 1000; // 1 hour idle timeout
    }
    
    // Spawn new agent
    async spawn(config) {
        const agent = {
            id: uuidv4(),
            type: config.type || 'chat',
            status: 'initializing',
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            clientIp: config.clientIp,
            config: config.config || {},
            process: null // Would hold actual agent process in production
        };
        
        // Initialize agent based on type
        try {
            await this.initializeAgent(agent);
            agent.status = 'running';
        } catch (error) {
            agent.status = 'error';
            agent.error = error.message;
        }
        
        this.agents.set(agent.id, agent);
        
        // Schedule cleanup
        this.scheduleCleanup(agent.id);
        
        return agent;
    }
    
    // Initialize agent (placeholder - would integrate with OpenClaw)
    async initializeAgent(agent) {
        // In production, this would:
        // 1. Connect to OpenClaw API
        // 2. Create new agent session
        // 3. Set up WebSocket connection for streaming
        // 4. Configure agent based on type
        
        console.log(`Initializing ${agent.type} agent for ${agent.clientIp}`);
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Get agent
    async get(id) {
        const agent = this.agents.get(id);
        if (!agent) return null;
        
        // Update last activity
        agent.lastActivity = new Date().toISOString();
        return agent;
    }
    
    // Terminate agent
    async terminate(id) {
        const agent = this.agents.get(id);
        if (!agent) {
            throw new Error('Agent not found');
        }
        
        // Cleanup resources
        if (agent.process) {
            // Kill process in production
            agent.process = null;
        }
        
        agent.status = 'terminated';
        this.agents.delete(id);
        
        return { success: true };
    }
    
    // List agents
    async list(options = {}) {
        const { limit = 100, offset = 0, status } = options;
        
        let agents = Array.from(this.agents.values());
        
        if (status) {
            agents = agents.filter(a => a.status === status);
        }
        
        return agents.slice(offset, offset + limit);
    }
    
    // Count agents
    async count() {
        return this.agents.size;
    }
    
    // Get agent stats
    async stats() {
        const agents = Array.from(this.agents.values());
        
        return {
            total: agents.length,
            byStatus: agents.reduce((acc, a) => {
                acc[a.status] = (acc[a.status] || 0) + 1;
                return acc;
            }, {}),
            byType: agents.reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + 1;
                return acc;
            }, {})
        };
    }
    
    // Schedule agent cleanup
    scheduleCleanup(agentId) {
        setTimeout(() => {
            const agent = this.agents.get(agentId);
            if (agent && agent.status === 'running') {
                const lastActivity = new Date(agent.lastActivity).getTime();
                const now = Date.now();
                
                if (now - lastActivity > this.AGENT_TTL) {
                    console.log(`Agent ${agentId} timed out, terminating`);
                    this.terminate(agentId).catch(console.error);
                } else {
                    // Reschedule
                    this.scheduleCleanup(agentId);
                }
            }
        }, this.AGENT_TTL);
    }
    
    // Update agent activity
    async updateActivity(id) {
        const agent = this.agents.get(id);
        if (agent) {
            agent.lastActivity = new Date().toISOString();
        }
    }
}

// Singleton instance
const agentManager = new AgentManager();

module.exports = { agentManager };
