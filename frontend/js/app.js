// MyOpenClawAgent - Frontend Application

(function() {
    'use strict';

    // Configuration
    const API_BASE = '/api/v1';

    // State
    let sessionId = null;
    let isSending = false;

    // DOM Elements
    const contactForm = document.getElementById('contact-form');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');

    // Initialize
    function init() {
        setupEventListeners();
        animateOnScroll();
    }

    // Event Listeners
    function setupEventListeners() {
        // Mobile menu toggle
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        }

        // Contact form submission
        if (contactForm) {
            contactForm.addEventListener('submit', handleContactSubmit);
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

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Navbar background on scroll
        window.addEventListener('scroll', handleScroll);
    }

    // Toggle mobile menu
    function toggleMobileMenu() {
        nav.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    }

    // Handle scroll
    function handleScroll() {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.boxShadow = 'var(--shadow)';
        } else {
            header.style.boxShadow = 'none';
        }
    }

    // Handle contact form submission
    async function handleContactSubmit(e) {
        e.preventDefault();
        
        if (isSending) return;

        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            service: formData.get('service'),
            message: formData.get('message')
        };

        isSending = true;
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        try {
            // Try to send via API
            const response = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Thank you for your message! We\'ll get back to you soon.');
                contactForm.reset();
            } else {
                throw new Error('Failed to send');
            }
        } catch (error) {
            // Fallback: open mailto
            const subject = encodeURIComponent(`New Contact: ${data.service || 'General'}`);
            const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`);
            window.location.href = `mailto:josh@myopenclawagent.com?subject=${subject}&body=${body}`;
        } finally {
            isSending = false;
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Animate elements on scroll
    function animateOnScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, { threshold: 0.1 });

        // Observe sections
        document.querySelectorAll('.section, .hero-content, .hero-visual').forEach(el => {
            observer.observe(el);
        });
    }

    // Smooth scroll polyfill for older browsers
    if (!CSS.supports('scroll-behavior', 'smooth')) {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
