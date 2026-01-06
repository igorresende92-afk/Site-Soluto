/* ==========================================================================
   SOLUTO TECNOLOGIA - Main JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all modules
  initNavigation();
  initAnimations();
  initSmoothScroll();
  initCounters();
});

// ===== Navigation =====
function initNavigation() {
  const header = document.querySelector('.header');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.nav');
  
  // Sticky header on scroll
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Mobile menu toggle
  if (mobileToggle) {
    mobileToggle.addEventListener('click', function() {
      mobileToggle.classList.toggle('active');
      nav.classList.toggle('active');
      document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });
    
    // Close menu on link click
    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileToggle.classList.remove('active');
        nav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
  
  // Active link based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ===== Scroll Animations =====
function initAnimations() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  
  if (reveals.length === 0) return;
  
  const revealOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const revealObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, revealOptions);
  
  reveals.forEach(reveal => {
    revealObserver.observe(reveal);
  });
}

// ===== Smooth Scroll =====
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ===== Counter Animation =====
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  
  if (counters.length === 0) return;
  
  const counterOptions = {
    threshold: 0.5
  };
  
  const counterObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseInt(counter.getAttribute('data-target'));
        const suffix = counter.getAttribute('data-suffix') || '';
        const prefix = counter.getAttribute('data-prefix') || '';
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
          current += step;
          if (current < target) {
            counter.textContent = prefix + Math.floor(current) + suffix;
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = prefix + target + suffix;
          }
        };
        
        updateCounter();
        observer.unobserve(counter);
      }
    });
  }, counterOptions);
  
  counters.forEach(counter => {
    counterObserver.observe(counter);
  });
}

// ===== Particle Effect (for Hero) =====
function createParticles(container, count = 20) {
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles';
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 5 + 's';
    particle.style.animationDuration = (5 + Math.random() * 5) + 's';
    particlesContainer.appendChild(particle);
  }
  
  container.appendChild(particlesContainer);
}

// Initialize particles in hero if exists
document.addEventListener('DOMContentLoaded', function() {
  const hero = document.querySelector('.hero-bg');
  if (hero) {
    createParticles(hero, 15);
  }
});

// ===== Utility Functions =====

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
