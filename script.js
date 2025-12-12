// ========================================
// BeakyBabe - Interactive JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initNavbar();
    initScrollAnimations();
    initMobileMenu();
    initPricingToggle();
    initSmoothScroll();
    initTypingEffect();
});

// Navbar scroll effect
function initNavbar() {
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Scroll animations using Intersection Observer
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add animation classes to elements
    const animatedElements = document.querySelectorAll(
        '.feature-card, .step-card, .pricing-card, .testimonial-card, .section-header'
    );

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add staggered delays for grid items
    document.querySelectorAll('.features-grid .feature-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.1}s`;
    });

    document.querySelectorAll('.steps-container .step-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.15}s`;
    });

    document.querySelectorAll('.pricing-grid .pricing-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.1}s`;
    });

    document.querySelectorAll('.testimonials-grid .testimonial-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.1}s`;
    });
}

// Add class when element is in view
document.addEventListener('scroll', () => {
    document.querySelectorAll('.animate-in').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
});

// Mobile menu toggle
function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
            mobileToggle.classList.toggle('active');
        });
    }
}

// Pricing toggle (monthly/yearly)
function initPricingToggle() {
    const toggle = document.getElementById('pricingToggle');
    
    if (toggle) {
        toggle.addEventListener('change', () => {
            const isYearly = toggle.checked;
            
            document.querySelectorAll('.price-amount[data-monthly]').forEach(price => {
                const monthly = price.dataset.monthly;
                const yearly = price.dataset.yearly;
                price.textContent = `$${isYearly ? yearly : monthly}`;
            });
        });
    }
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Close mobile menu if open
                const navLinks = document.getElementById('navLinks');
                const mobileToggle = document.getElementById('mobileToggle');
                if (navLinks) navLinks.classList.remove('mobile-open');
                if (mobileToggle) mobileToggle.classList.remove('active');
            }
        });
    });
}

// Typing effect for domain demo
function initTypingEffect() {
    const typingElement = document.querySelector('.typing-effect');
    
    if (typingElement) {
        const names = ['jessica', 'marcus', 'emily', 'alex', 'sarah'];
        let nameIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        
        function type() {
            const currentName = names[nameIndex];
            
            if (isDeleting) {
                typingElement.textContent = currentName.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typingElement.textContent = currentName.substring(0, charIndex + 1);
                charIndex++;
            }
            
            let typeSpeed = isDeleting ? 50 : 100;
            
            if (!isDeleting && charIndex === currentName.length) {
                typeSpeed = 2000; // Pause at end
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                nameIndex = (nameIndex + 1) % names.length;
                typeSpeed = 500;
            }
            
            setTimeout(type, typeSpeed);
        }
        
        type();
    }
}

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start).toLocaleString();
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    }
    
    updateCounter();
}

// Initialize counters when in view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                if (text.includes('K')) {
                    const num = parseFloat(text) * 1000;
                    animateCounter(stat, num);
                    setTimeout(() => {
                        stat.textContent = text;
                    }, 2100);
                } else if (text.includes('M')) {
                    const num = parseFloat(text) * 1000000;
                    animateCounter(stat, num);
                    setTimeout(() => {
                        stat.textContent = text;
                    }, 2100);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Parallax effect for orbs
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const orbs = document.querySelectorAll('.orb');
    
    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 0.1;
        orb.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Add hover effect to cards
document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card').forEach(card => {
    card.addEventListener('mouseenter', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.style.setProperty('--mouse-x', `${x}px`);
        this.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Console easter egg
console.log('%c🐦 BeakyBabe', 'font-size: 24px; font-weight: bold; color: #a855f7;');
console.log('%cBuilt for creators who mean business.', 'font-size: 14px; color: #888;');
console.log('%cInterested in joining our team? hello@beakybabe.io', 'font-size: 12px; color: #06b6d4;');
