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

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSending) return;

        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message')
        };

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
            const subject = encodeURIComponent('New Contact from MyOpenClawAgent');
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
