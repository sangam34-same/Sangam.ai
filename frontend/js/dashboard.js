/* ============================================================
   SANGAM.AI — CUSTOMER DASHBOARD (dashboard.js)
   Handles: auth guard, user display, stats, pipeline, orders
   Exposes: (no public API — page-scoped IIFE)
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (window.SANGAM_CONFIG && window.SANGAM_CONFIG.API_BASE) || '';
  var TOKEN_KEY = 'sangam_token';
  var USER_KEY = 'sangam_user';

  var STATUS_MAP = {
    REQUEST_RECEIVED: { label: 'Requested', progress: 10, cls: 'status-pending' },
    DISCOVERY:        { label: 'Discovery', progress: 30, cls: 'status-progress' },
    DEVELOPMENT:      { label: 'In Development', progress: 55, cls: 'status-progress' },
    TESTING:          { label: 'Testing', progress: 75, cls: 'status-progress' },
    DEPLOYMENT:       { label: 'Deploying', progress: 90, cls: 'status-progress' },
    LIVE:             { label: 'Live', progress: 100, cls: 'status-live' },
    CANCELLED:        { label: 'Cancelled', progress: 0, cls: 'status-cancelled' }
  };

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  var state = {
    orders: []
  };

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

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  /* ----------------------------------------------------------
     STORAGE
     ---------------------------------------------------------- */
  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ----------------------------------------------------------
     FORMATTERS
     ---------------------------------------------------------- */
  function formatDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '—';
    }
  }

  function statusFor(status) {
    return STATUS_MAP[status] || { label: status || 'Unknown', progress: 10, cls: 'status-pending' };
  }

  /* ----------------------------------------------------------
     AUTH GUARD
     ---------------------------------------------------------- */
  function requireAuth() {
    if (!getToken()) {
      window.location.href = 'login.html?next=dashboard';
      return false;
    }
    return true;
  }

  /* ----------------------------------------------------------
     AUTHENTICATED FETCH
     ---------------------------------------------------------- */
  function authFetch(path, options) {
    options = options || {};
    options.headers = options.headers || {};

    var token = getToken();
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    options.headers['Content-Type'] = 'application/json';

    return fetch(API_BASE + path, options).then(function (res) {
      return res.json().then(
        function (data) {
          return { ok: res.ok, status: res.status, data: data };
        },
        function () {
          return { ok: res.ok, status: res.status, data: null };
        }
      );
    });
  }

  function handleAuthFailure(status) {
    if (status === 401) {
      clearAuth();
      window.location.href = 'login.html';
      return true;
    }
    return false;
  }

  /* ----------------------------------------------------------
     USER DISPLAY
     ---------------------------------------------------------- */
  function renderUser() {
    var user = getUser();
    var displayName = (user && user.name) ? user.name : 'Guest';
    var firstName = displayName.split(' ')[0];

    var nameEl = document.getElementById('userName');
    var avatarEl = document.getElementById('userAvatar');
    var welcomeEl = document.getElementById('welcomeName');

    if (nameEl) nameEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = String(displayName).charAt(0).toUpperCase();
    if (welcomeEl) welcomeEl.textContent = 'Hello, ' + firstName + ' 👋';
  }

  /* ----------------------------------------------------------
     STATS + PIPELINE
     ---------------------------------------------------------- */
  function updateStats(orders) {
    if (!Array.isArray(orders)) orders = [];

    var total = orders.length;

    var active = orders.filter(function (o) {
      return [
        'REQUEST_RECEIVED',
        'DISCOVERY',
        'DEVELOPMENT',
        'TESTING',
        'DEPLOYMENT'
      ].indexOf(o.status) !== -1;
    }).length;

    var live = orders.filter(function (o) {
      return o.status === 'LIVE';
    }).length;

    setText('statTotal', total);
    setText('statActive', active);
    setText('statLive', live);
    setText('statMessages', 0);

    // Pipeline counts
    var counts = {
      REQUEST_RECEIVED: 0,
      DISCOVERY: 0,
      DEVELOPMENT: 0,
      TESTING: 0,
      DEPLOYMENT: 0,
      LIVE: 0
    };

    orders.forEach(function (o) {
      if (counts[o.status] != null) counts[o.status] += 1;
    });

    setText('pipeRequested', counts.REQUEST_RECEIVED);
    setText('pipeDiscovery', counts.DISCOVERY);
    setText('pipeDevelopment', counts.DEVELOPMENT);
    setText('pipeTesting', counts.TESTING);
    setText('pipeDeployment', counts.DEPLOYMENT);
    setText('pipeLive', counts.LIVE);
  }

  /* ----------------------------------------------------------
     ORDER RENDER
     ---------------------------------------------------------- */
  function renderOrders(orders) {
    var container = document.getElementById('ordersContainer');
    var emptyEl = document.getElementById('ordersEmpty');
    var subEl = document.getElementById('ordersSub');

    if (!container) return;

    if (!Array.isArray(orders)) orders = [];

    if (subEl) {
      subEl.textContent = orders.length === 1
        ? '1 request'
        : orders.length + ' requests';
    }

    if (!orders.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    var html = orders.map(function (o) {
      var meta = statusFor(o.status);
      var services = Array.isArray(o.services) ? o.services : [];
      var orderNumber = o.order_number || o.orderNumber || '—';
      var business = o.business_name || o.businessName || '—';
      var industry = o.industry || '—';
      var createdAt = o.created_at || o.createdAt;

      var servicesHtml = services.length
        ? '<div class="order-services">' +
            services.map(function (s) {
              return '<span class="order-service-chip">' + escapeHtml(s) + '</span>';
            }).join('') +
          '</div>'
        : '';

      return (
        '<article class="order-card">' +
          '<div class="order-card-head">' +
            '<div>' +
              '<div class="order-number">' + escapeHtml(orderNumber) + '</div>' +
              '<div class="order-meta">' +
                escapeHtml(business) + ' · ' + escapeHtml(industry) +
              '</div>' +
            '</div>' +
            '<span class="status-pill ' + meta.cls + '">' + escapeHtml(meta.label) + '</span>' +
          '</div>' +

          '<div class="order-progress">' +
            '<div class="order-progress-bar">' +
              '<div class="order-progress-fill" style="width:' + meta.progress + '%"></div>' +
            '</div>' +
            '<div class="order-progress-label">' + meta.progress + '% complete</div>' +
          '</div>' +

          servicesHtml +

          '<div class="order-foot">' +
            '<span class="order-date">Submitted ' + escapeHtml(formatDate(createdAt)) + '</span>' +
            '<a href="contact.html?order=' + encodeURIComponent(orderNumber) + '" class="order-link">' +
              'Get update →' +
            '</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    container.innerHTML = html;
  }

  /* ----------------------------------------------------------
     DATA LOADING
     ---------------------------------------------------------- */
  function loadDashboard() {
    authFetch('/api/orders', { method: 'GET' })
      .then(function (res) {
        if (handleAuthFailure(res.status)) return;

        var orders = (res.ok && Array.isArray(res.data)) ? res.data : [];
        state.orders = orders;

        renderOrders(orders);
        updateStats(orders);
      })
      .catch(function (err) {
        console.error('[dashboard] load failed:', err);
        state.orders = [];
        renderOrders([]);
        updateStats([]);
      });
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
    }
  }

  /* ----------------------------------------------------------
     USER MENU
     ---------------------------------------------------------- */
  function initUserMenu() {
    var userBtn = document.getElementById('userBtn');
    var userDropdown = document.getElementById('userDropdown');

    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = userDropdown.hidden;
        userDropdown.hidden = !isOpen;
        userBtn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', function (e) {
        if (userDropdown.hidden) return;
        if (!userDropdown.contains(e.target) && e.target !== userBtn) {
          userDropdown.hidden = true;
          userBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          userDropdown.hidden = true;
          userBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        clearAuth();
        window.location.href = 'login.html';
      });
    }
  }

  /* ----------------------------------------------------------
     YEAR
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
    initYear();
    initNavbar();
    initUserMenu();

    if (!requireAuth()) return;

    renderUser();
    loadDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();