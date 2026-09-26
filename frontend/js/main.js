/* ============================================================
   SANGAM.AI — SHARED SITE BEHAVIORS (main.js)
   Handles: navbar, mobile menu, reveal animations, FAQ accordion,
            home services grid, playground tabs, hero spotlight,
            demo chat animation, year auto-fill, toast notifications,
            smooth scroll, and universal page-wide utilities.
   Exposes: window.Sangam = { showToast, refreshServices, ... }
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '';

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
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function resolveIcon(icon) {
    if (!icon) return '🤖';
    if (icon.length <= 4) return icon;
    return ICON_MAP[icon] || '🤖';
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 150);
    };
  }

  function throttle(fn, wait) {
    var last = 0, timeout = null;
    return function () {
      var now = Date.now(), ctx = this, args = arguments;
      if (now - last >= wait) {
        last = now;
        fn.apply(ctx, args);
      } else if (!timeout) {
        timeout = setTimeout(function () {
          last = Date.now();
          timeout = null;
          fn.apply(ctx, args);
        }, wait - (now - last));
      }
    };
  }

  /* ----------------------------------------------------------
     TOAST NOTIFICATION (universal)
     ---------------------------------------------------------- */
  var toastTimer = null;
  function showToast(message, type) {
    var toast = document.getElementById('toast');
    var toastIcon = document.getElementById('toastIcon');
    var toastMessage = document.getElementById('toastMessage');

    // If the page doesn't have a toast element, create one on the fly
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML =
        '<svg id="toastIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
        '<span id="toastMessage">Notification</span>';
      document.body.appendChild(toast);
      toastIcon = toast.querySelector('#toastIcon');
      toastMessage = toast.querySelector('#toastMessage');

      // Inject minimal styles if not present
      if (!document.getElementById('toast-styles')) {
        var style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent =
          '.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);' +
          'padding:14px 24px;border-radius:999px;background:rgba(10,5,18,.98);backdrop-filter:blur(16px);' +
          'border:1px solid rgba(255,255,255,.14);color:#fff;font-size:14px;font-weight:500;' +
          'box-shadow:0 25px 80px rgba(0,0,0,.5);z-index:9999;opacity:0;pointer-events:none;' +
          'transition:all .4s cubic-bezier(.22,1,.36,1);display:flex;align-items:center;gap:10px;' +
          'max-width:calc(100vw - 48px);font-family:inherit}' +
          '.toast.show{transform:translateX(-50%) translateY(0);opacity:1}' +
          '.toast.success{border-color:rgba(16,185,129,.4)}.toast.success svg{color:#10b981}' +
          '.toast.error{border-color:rgba(248,113,113,.4)}.toast.error svg{color:#f87171}' +
          '.toast svg{width:18px;height:18px;flex-shrink:0}';
        document.head.appendChild(style);
      }
    }

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = 'toast show ' + (type || 'success');

    if (toastIcon) {
      toastIcon.innerHTML = type === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
        : '<path d="M20 6 9 17l-5-5"/>';
    }

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3500);
  }

  /* ----------------------------------------------------------
     NAVBAR (scroll + mobile toggle)
     ---------------------------------------------------------- */
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    if (navbar) {
      var onScroll = throttle(function () {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
      }, 100);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
      // Toggle on click
      navToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
      });

      // Close when a link is clicked on mobile
      $$('a', navLinks).forEach(function (a) {
        a.addEventListener('click', function () {
          if (window.innerWidth < 960) {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });

      // Close when clicking outside the menu (mobile)
      document.addEventListener('click', function (e) {
        if (window.innerWidth >= 960) return;
        if (navLinks.classList.contains('open') &&
            !navLinks.contains(e.target) &&
            e.target !== navToggle &&
            !navToggle.contains(e.target)) {
          navLinks.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });

      // Close on escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });

      // Close on resize to desktop
      window.addEventListener('resize', debounce(function () {
        if (window.innerWidth >= 960 && navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }, 200));
    }

    // "Back" button in the navbar — auto-shows if the user came from another page
    var navBack = document.getElementById('navBack');
    if (navBack) {
      try {
        if (document.referrer && document.referrer.indexOf(window.location.host) !== -1 &&
            document.referrer.indexOf('index.html') === -1) {
          navBack.hidden = false;
          navBack.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.history.length > 1) window.history.back();
            else window.location.href = 'index.html';
          });
        }
      } catch (e) { /* ignore */ }
    }
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL
     ---------------------------------------------------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = parseInt(entry.target.getAttribute('data-delay') || '0', 10);
          setTimeout(function () {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach(function (el) { observer.observe(el); });

    // Safety net: after 2.5s, force-show anything in viewport
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
     HOME SERVICES GRID (dynamic load)
     ---------------------------------------------------------- */
  function initHomeServices() {
    var grid = document.getElementById('servicesGrid');
    if (!grid) return;

    function render(list) {
      if (!Array.isArray(list) || !list.length) {
        list = FALLBACK_SERVICES;
      }
      list = list.slice(0, 6);

      var html = list.map(function (s) {
        var icon = resolveIcon(s.icon);
        var slug = s.slug || '';
        return (
          '<article class="service-card">' +
            '<div class="service-card-icon">' + icon + '</div>' +
            '<h3 class="service-card-title">' + escapeHtml(s.name) + '</h3>' +
            '<p class="service-card-desc">' + escapeHtml(s.description || '') + '</p>' +
            '<a href="request.html?service=' + encodeURIComponent(slug) + '" class="service-card-link">' +
              'Explore' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
            '</a>' +
          '</article>'
        );
      }).join('');

      grid.innerHTML = html;
    }

    // Try the api.js wrapper first
    if (global.api && typeof global.api.getServices === 'function') {
      global.api.getServices()
        .then(function (res) {
          if (res && res.ok && Array.isArray(res.data) && res.data.length) {
            render(res.data);
          } else {
            render(FALLBACK_SERVICES);
          }
        })
        .catch(function () { render(FALLBACK_SERVICES); });
      return;
    }

    // Fallback to raw fetch
    fetch(API_BASE + '/api/services', { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('bad');
        return r.json();
      })
      .then(function (data) {
        render(Array.isArray(data) && data.length ? data : FALLBACK_SERVICES);
      })
      .catch(function () { render(FALLBACK_SERVICES); });
  }

  /* ----------------------------------------------------------
     PLAYGROUND TABS (if present)
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
     HERO SPOTLIGHT (mouse follow — home page only)
     ---------------------------------------------------------- */
  function initSpotlight() {
    var hero = document.querySelector('.hero, .hero-new');
    var spotlight = document.getElementById('heroSpotlight');
    if (!hero || !spotlight) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      spotlight.style.left = (e.clientX - rect.left) + 'px';
      spotlight.style.top = (e.clientY - rect.top) + 'px';
    });
  }

  /* ----------------------------------------------------------
     DEMO CHAT ANIMATION (home page only)
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
      b.style.transition = 'opacity .5s ease, transform .5s ease';
    });
    actions.forEach(function (a) { a.classList.remove('active'); });

    if (!('IntersectionObserver' in window)) {
      bubbles.forEach(function (b) {
        b.style.opacity = '1';
        b.style.transform = 'translateY(0)';
      });
      actions.forEach(function (a) { a.classList.add('active'); });
      return;
    }

    var triggered = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          playSequence(bubbles, actions);
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(chatBody);
  }

  function playSequence(bubbles, actions) {
    bubbles.forEach(function (bubble, i) {
      setTimeout(function () {
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';
        if (i >= 3 && actions[i - 3]) actions[i - 3].classList.add('active');
        if (i === bubbles.length - 1 && actions[3]) actions[3].classList.add('active');
      }, i * 900);
    });
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL FOR ANCHOR LINKS
     ---------------------------------------------------------- */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        var y = target.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });

        // Update URL without jumping
        if (history.replaceState) {
          history.replaceState(null, '', href);
        }
      });
    });
  }

  /* ----------------------------------------------------------
     YEAR AUTO-FILL
     ---------------------------------------------------------- */
  function initYear() {
    var els = $$('#year, .js-year');
    var year = String(new Date().getFullYear());
    els.forEach(function (el) { el.textContent = year; });
  }

  /* ----------------------------------------------------------
     EXTERNAL LINKS — open in new tab safely
     ---------------------------------------------------------- */
  function initExternalLinks() {
    $$('a[href^="http"]').forEach(function (a) {
      try {
        var url = new URL(a.href);
        if (url.hostname && url.hostname !== window.location.hostname) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
      } catch (e) { /* ignore */ }
    });
  }

  /* ----------------------------------------------------------
     FORM HELPERS — disable double-submit on all forms
     ---------------------------------------------------------- */
  function initFormSafety() {
    $$('form').forEach(function (form) {
      form.addEventListener('submit', function () {
        var btn = form.querySelector('button[type="submit"]');
        if (btn && !btn.dataset.originalDisabled) {
          // Prevent double-click within 1.5s
          btn.dataset.originalDisabled = 'false';
          setTimeout(function () {
            if (btn) btn.disabled = false;
          }, 1500);
        }
      });
    });
  }

  /* ----------------------------------------------------------
     NETWORK STATUS DETECTION
     ---------------------------------------------------------- */
  function initNetworkStatus() {
    function update() {
      if (!navigator.onLine) {
        showToast('You are offline — some features may not work.', 'error');
      }
    }
    window.addEventListener('online', function () {
      showToast('Back online!', 'success');
    });
    window.addEventListener('offline', update);
  }

  /* ----------------------------------------------------------
     VISIBILITY — pause heavy work when tab is hidden
     ---------------------------------------------------------- */
  function initVisibility() {
    // Placeholder for pages that add timers/animations.
    // Any page-specific logic can subscribe to this event.
    document.addEventListener('visibilitychange', function () {
      document.documentElement.setAttribute('data-visibility', document.hidden ? 'hidden' : 'visible');
    });
  }

  /* ----------------------------------------------------------
     PUBLIC API — expose helpers for page scripts
     ---------------------------------------------------------- */
  global.Sangam = global.Sangam || {};
  global.Sangam.showToast = showToast;
  global.Sangam.$ = $;
  global.Sangam.$$ = $$;
  global.Sangam.escapeHtml = escapeHtml;
  global.Sangam.resolveIcon = resolveIcon;
  global.Sangam.ICON_MAP = ICON_MAP;
  global.Sangam.FALLBACK_SERVICES = FALLBACK_SERVICES;

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    initNavbar();
    initReveal();
    initFaq();
    initHomeServices();
    initPlaygroundTabs();
    initSpotlight();
    initDemoChat();
    initSmoothScroll();
    initYear();
    initExternalLinks();
    initFormSafety();
    initNetworkStatus();
    initVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ----------------------------------------------------------
     LATE FAILSAFE — if the year or reveals haven't been set
     (e.g., because another script errored), retry once.
     ---------------------------------------------------------- */
  setTimeout(function () {
    try {
      var els = document.querySelectorAll('#year, .js-year');
      if (els.length) {
        var year = String(new Date().getFullYear());
        els.forEach(function (el) { if (!el.textContent) el.textContent = year; });
      }
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('visible');
        }
      });
    } catch (e) { /* silent */ }
  }, 3200);

})(window);