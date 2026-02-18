const { v4: uuidv4 } = require('uuid');

// In-memory session store (would use Redis in production)
// Uses Map for O(1) lookups

class SessionStore {
    constructor() {
        this.sessions = new Map();
        this.cleanupInterval = null;
        this.SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
    }
    
    // Initialize cleanup job
    init() {
        // Clean up expired sessions every hour
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 60 * 1000);
    }
    
    // Cleanup expired sessions
    cleanup() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            const lastActivity = new Date(session.updatedAt || session.createdAt).getTime();
            if (now - lastActivity > this.SESSION_TTL) {
                this.sessions.delete(id);
            }
        }
    }
    
    // Get session
    async get(id) {
        const session = this.sessions.get(id);
        if (!session) return null;
        
        // Update last activity
        session.updatedAt = new Date().toISOString();
        return session;
    }
    
    // Set session
    async set(id, session) {
        session.updatedAt = new Date().toISOString();
        this.sessions.set(id, session);
        return session;
    }
    
    // Create new session
    async create(data = {}) {
        const session = {
            id: data.id || uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            ...data
        };
        this.sessions.set(session.id, session);
        return session;
    }
    
    // Delete session
    async delete(id) {
        return this.sessions.delete(id);
    }
    
    // List sessions (for admin)
    async list(options = {}) {
        const { limit = 100, offset = 0 } = options;
        return Array.from(this.sessions.values())
            .slice(offset, offset + limit);
    }
    
    // Count sessions
    async count() {
        return this.sessions.size;
    }
    
    // Get stats
    async stats() {
        const sessions = Array.from(this.sessions.values());
        const now = Date.now();
        
        return {
            total: sessions.length,
            activeLastHour: sessions.filter(s => {
                const lastActivity = new Date(s.updatedAt).getTime();
                return (now - lastActivity) < 60 * 60 * 1000;
            }).length,
            totalMessages: sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0)
        };
    }
    
    // Shutdown
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Singleton instance
const sessionStore = new SessionStore();

module.exports = { sessionStore };
