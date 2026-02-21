// MyOpenClawAgent - Simple Landing Page

(function() {
    'use strict';

    const API_BASE = '/api/v1';
    let isSending = false;

    // DOM Elements
    const contactForm = document.getElementById('contact-form');

    function init() {
        if (contactForm) {
            contactForm.addEventListener('submit', handleSubmit);
        }
        
        // Initialize character counts
        ['name', 'email', 'message'].forEach(field => {
            const input = document.getElementById(field);
            const countId = field + '-count';
            if (input && countId) {
                const max = field === 'message' ? 250 : 100;
                updateCharCount(countId, input.value.length, max);
            }
        });
        
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            });
        });
    }

    // Update character count display
    window.updateCharCount = function(elementId, current, max) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = current + ' / ' + max;
            el.classList.toggle('at-limit', current >= max);
        }
    };

    // Mobile menu toggle
    window.toggleMenu = function() {
        const nav = document.getElementById('main-nav');
        const btn = document.querySelector('.mobile-menu-btn');
        if (nav && btn) {
            nav.classList.toggle('active');
            btn.classList.toggle('active');
        }
    };

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSending) return;

        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message')
        };

        // Frontend validation: check character limits
        const nameLen = data.name.length;
        const emailLen = data.email.length;
        const messageLen = data.message.length;
        
        if (nameLen > 100 || emailLen > 100 || messageLen > 250) {
            alert('Please reduce the length of the following fields:\n' +
                (nameLen > 100 ? '- Name must be 100 characters or less\n' : '') +
                (emailLen > 100 ? '- Email must be 100 characters or less\n' : '') +
                (messageLen > 250 ? '- Message must be 250 characters or less\n' : ''));
            return;
        }

        isSending = true;
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Sending...';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Thank you! We\'ll be in touch soon.');
                contactForm.reset();
            } else {
                throw new Error('Failed');
            }
        } catch (error) {
            // Fallback to email
            const subject = encodeURIComponent('New Contact - MyOpenClawAgent');
            const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`);
            window.location.href = `mailto:josh@myopenclawagent.com?subject=${subject}&body=${body}`;
        } finally {
            isSending = false;
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
