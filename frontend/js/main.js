/* ============================================================
   SANGAM.AI — SHARED SITE BEHAVIORS (main.js)
   Handles: navbar, mobile menu, reveal, FAQ, service grid,
            demo chat animation, playground tabs, year
   Exposes: (no public API — page-scoped IIFE)
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (window.SANGAM_CONFIG && window.SANGAM_CONFIG.API_BASE) || '';

  /* Icon name → emoji map for services */
  var ICON_MAP = {
    'message-circle': '💬',
    'instagram': '📷',
    'mail': '✉️',
    'phone': '📞',
    'phone-outgoing': '📞',
    'message-square': '💬',
    'target': '🎯',
    'calendar': '📅',
    'database': '🗂️',
    'workflow': '⚙️',
    'book-open': '📚',
    'bot': '🤖',
    'zap': '⚡'
  };

  /* Fallback services for home grid if API fails */
  var FALLBACK_SERVICES = [
    {
      name: 'WhatsApp AI Agent',
      slug: 'whatsapp-ai',
      icon: '💬',
      description: 'Instant WhatsApp replies, booking and support — 24/7.'
    },
    {
      name: 'Instagram AI Agent',
      slug: 'instagram-ai',
      icon: '📷',
      description: 'Auto-reply to DMs, comments and story mentions.'
    },
    {
      name: 'AI Voice Receptionist',
      slug: 'voice-receptionist',
      icon: '📞',
      description: 'Answers calls, books appointments, routes to humans.'
    },
    {
      name: 'AI Chatbot',
      slug: 'chatbot',
      icon: '🤖',
      description: 'Website chat trained on your business knowledge.'
    },
    {
      name: 'Lead Generation Agent',
      slug: 'lead-gen',
      icon: '🎯',
      description: 'Finds, qualifies and follows up with leads automatically.'
    },
    {
      name: 'CRM Automation',
      slug: 'crm',
      icon: '🗂️',
      description: 'Auto-updates contacts, tags and pipeline movement.'
    }
  ];

  /* ----------------------------------------------------------
     DOM HELPERS
     ---------------------------------------------------------- */
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveIcon(icon) {
    if (!icon) return '🤖';
    if (icon.length <= 4) return icon;
    return ICON_MAP[icon] || '🤖';
  }

  /* ----------------------------------------------------------
     NAVBAR
     ---------------------------------------------------------- */
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    if (navbar) {
      var onScroll = function () {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        var open = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
      });

      // Close mobile menu when a link is clicked
      $$('a', navLinks).forEach(function (a) {
        a.addEventListener('click', function () {
          if (window.innerWidth < 980) {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });

      // Close mobile menu on resize to desktop
      window.addEventListener('resize', function () {
        if (window.innerWidth >= 980 && navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL
     ---------------------------------------------------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = parseInt(
              entry.target.getAttribute('data-delay') || '0',
              10
            );
            setTimeout(function () {
              entry.target.classList.add('visible');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });

    // Safety net: after 2.5s, force-show any reveal element in the viewport
    setTimeout(function () {
      items.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('visible');
        }
      });
    }, 2500);
  }

  /* ----------------------------------------------------------
     FAQ ACCORDION
     ---------------------------------------------------------- */
  function initFaq() {
    var items = $$('.faq-item');
    if (!items.length) return;

    items.forEach(function (item) {
      var btn = $('.faq-question', item);
      if (!btn) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');

        // Close all others
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove('open');
            var ob = $('.faq-question', other);
            if (ob) ob.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle this one
        item.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  /* ----------------------------------------------------------
     DEMO CHAT ANIMATION (home page)
     ---------------------------------------------------------- */
  function initDemoChat() {
    var chatBody = document.getElementById('chatBody');
    if (!chatBody) return;

    var bubbles = $$('.chat-bubble', chatBody);
    var actions = $$('.action-item');
    if (!bubbles.length) return;

    // Start hidden
    bubbles.forEach(function (b) {
      b.style.opacity = '0';
      b.style.transform = 'translateY(10px)';
    });
    actions.forEach(function (a) {
      a.classList.remove('active');
    });

    if (!('IntersectionObserver' in window)) {
      bubbles.forEach(function (b) {
        b.style.opacity = '1';
        b.style.transform = 'translateY(0)';
      });
      actions.forEach(function (a) {
        a.classList.add('active');
      });
      return;
    }

    var triggered = false;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            playSequence(bubbles, actions);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(chatBody);
  }

  function playSequence(bubbles, actions) {
    bubbles.forEach(function (bubble, i) {
      setTimeout(function () {
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';

        if (i >= 3 && actions[i - 3]) {
          actions[i - 3].classList.add('active');
        }
        if (i === bubbles.length - 1 && actions[3]) {
          actions[3].classList.add('active');
        }
      }, i * 900);
    });
  }

  /* ----------------------------------------------------------
     HOME SERVICES GRID
     ---------------------------------------------------------- */
  function initHomeServices() {
    var grid = document.getElementById('servicesGrid');
    if (!grid) return;

    function render(list) {
      if (!Array.isArray(list) || !list.length) {
        list = FALLBACK_SERVICES;
      }
      list = list.slice(0, 6);

      var html = list
        .map(function (s) {
          var icon = resolveIcon(s.icon);
          var slug = s.slug || '';
          return (
            '<article class="service-card">' +
            '<div class="service-card-icon">' + icon + '</div>' +
            '<h3 class="service-card-title">' + escapeHtml(s.name) + '</h3>' +
            '<p class="service-card-desc">' +
              escapeHtml(s.description) +
            '</p>' +
            '<a href="request.html?service=' +
              encodeURIComponent(slug) +
              '" class="service-card-link">' +
              'Explore' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
            '</a>' +
            '</article>'
          );
        })
        .join('');

      grid.innerHTML = html;
    }

    // Try API, fall back to embedded list
    if (window.api && typeof window.api.getServices === 'function') {
      window.api
        .getServices()
        .then(function (res) {
          if (res.ok && Array.isArray(res.data) && res.data.length) {
            render(res.data);
          } else {
            render(FALLBACK_SERVICES);
          }
        })
        .catch(function () {
          render(FALLBACK_SERVICES);
        });
    } else {
      fetch(API_BASE + '/api/services')
        .then(function (r) {
          if (!r.ok) throw new Error('bad');
          return r.json();
        })
        .then(function (data) {
          render(
            Array.isArray(data) && data.length ? data : FALLBACK_SERVICES
          );
        })
        .catch(function () {
          render(FALLBACK_SERVICES);
        });
    }
  }

  /* ----------------------------------------------------------
     PLAYGROUND TABS
     ---------------------------------------------------------- */
  function initPlaygroundTabs() {
    var tabs = $$('.playground-tab');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', String(active));
        });
      });
    });
  }

  /* ----------------------------------------------------------
     HERO SPOTLIGHT (mouse follow — home only)
     ---------------------------------------------------------- */
  function initSpotlight() {
    var hero = document.querySelector('.hero');
    var spotlight = document.getElementById('heroSpotlight');
    if (!hero || !spotlight) return;

    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      spotlight.style.left = e.clientX - rect.left + 'px';
      spotlight.style.top = e.clientY - rect.top + 'px';
    });
  }

  /* ----------------------------------------------------------
     YEAR AUTO-FILL
     ---------------------------------------------------------- */
  function initYear() {
    var el = document.getElementById('year');
    if (el) {
      el.textContent = String(new Date().getFullYear());
    }
  }

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    initNavbar();
    initReveal();
    initFaq();
    initDemoChat();
    initHomeServices();
    initPlaygroundTabs();
    initSpotlight();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();