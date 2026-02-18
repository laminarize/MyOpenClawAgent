// MyOpenClawAgent - Frontend Application

(function() {
    'use strict';

    // Configuration
    const API_BASE = '';
    const WS_ENDPOINT = '/ws';

    // State
    let sessionId = null;
    let ws = null;
    let isConnected = false;
    let isSending = false;

    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatStatus = document.getElementById('chat-status');
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    // Initialize
    function init() {
        setupEventListeners();
        connectWebSocket();
    }

    // Event Listeners
    function setupEventListeners() {
        // Navigation
        navLinks.forEach(link => {
            link.addEventListener('click', handleNavigation);
        });

        // Chat form
        chatForm.addEventListener('submit', handleSubmit);
        
        // Auto-resize textarea
        chatInput.addEventListener('input', autoResize);
        
        // Enter to send (Shift+Enter for newline)
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Handle navigation
    function handleNavigation(e) {
        e.preventDefault();
        const page = e.target.dataset.page;
        
        navLinks.forEach(link => link.classList.remove('active'));
        e.target.classList.add('active');
        
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
    }

    // Auto-resize textarea
    function autoResize() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    }

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();
        
        const message = chatInput.value.trim();
        if (!message || isSending) return;
        
        // Clear input
        chatInput.value = '';
        autoResize();
        
        // Add user message
        addMessage(message, 'user');
        
        // Send to API
        await sendMessage(message);
    }

    // Add message to chat
    function addMessage(content, role) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>
            </div>
            <span class="message-time">${time}</span>
        `;
        
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send message to API
    async function sendMessage(message) {
        isSending = true;
        updateStatus('Sending...', 'sending');
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update session ID
            if (data.sessionId && !sessionId) {
                sessionId = data.sessionId;
            }
            
            // Add assistant response
            if (data.message) {
                addMessage(data.message.content, 'assistant');
            }
            
            updateStatus('', '');
        } catch (error) {
            console.error('Send error:', error);
            updateStatus('Failed to send message. Please try again.', 'error');
            addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
        } finally {
            isSending = false;
        }
    }

    // Update status
    function updateStatus(text, type) {
        chatStatus.textContent = text;
        chatStatus.className = 'chat-status ' + type;
    }

    // WebSocket connection
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}${WS_ENDPOINT}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            isConnected = true;
            console.log('WebSocket connected');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWsMessage(data);
            } catch (e) {
                console.error('WebSocket parse error:', e);
            }
        };
        
        ws.onclose = () => {
            isConnected = false;
            console.log('WebSocket disconnected');
            // Reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    // Handle WebSocket messages
    function handleWsMessage(data) {
        switch (data.type) {
            case 'ack':
                // Message acknowledged
                break;
            case 'response':
                // Streaming response
                addMessage(data.content, 'assistant');
                break;
            case 'error':
                updateStatus(data.message, 'error');
                break;
        }
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
