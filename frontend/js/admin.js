/* ============================================================
   SANGAM.AI — ADMIN CONSOLE (admin.js)
   Handles: admin guard, orders, leads, analytics, filters
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (window.SANGAM_CONFIG && window.SANGAM_CONFIG.API_BASE) || '';
  var TOKEN_KEY = 'sangam_token';
  var USER_KEY = 'sangam_user';

  var STATUS_LIST = [
    'REQUEST_RECEIVED',
    'DISCOVERY',
    'DEVELOPMENT',
    'TESTING',
    'DEPLOYMENT',
    'LIVE',
    'CANCELLED'
  ];

  var STATUS_LABELS = {
    REQUEST_RECEIVED: 'Requested',
    DISCOVERY: 'Discovery',
    DEVELOPMENT: 'Development',
    TESTING: 'Testing',
    DEPLOYMENT: 'Deployment',
    LIVE: 'Live',
    CANCELLED: 'Cancelled'
  };

  var STATUS_CLASSES = {
    REQUEST_RECEIVED: 'status-pending',
    DISCOVERY: 'status-progress',
    DEVELOPMENT: 'status-progress',
    TESTING: 'status-progress',
    DEPLOYMENT: 'status-progress',
    LIVE: 'status-live',
    CANCELLED: 'status-cancelled'
  };

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  var state = {
    orders: [],
    leads: [],
    ordersQuery: '',
    ordersStatus: '',
    leadsQuery: ''
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

  function truncate(s, n) {
    var str = String(s == null ? '' : s);
    return str.length > n ? str.slice(0, n) + '…' : str;
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
     UTILITIES
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

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v != null && v !== '') return v;
    }
    return '';
  }

  /* ----------------------------------------------------------
     AUTH GUARD
     ---------------------------------------------------------- */
  function requireAdmin() {
    var token = getToken();
    var user = getUser();

    if (!token || !user) {
      window.location.href = 'login.html?next=admin';
      return false;
    }
    if (user.role !== 'ADMIN') {
      window.location.href = 'dashboard.html';
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
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }
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
    if (status === 403) {
      window.location.href = 'dashboard.html';
      return true;
    }
    return false;
  }

  /* ----------------------------------------------------------
     USER DISPLAY
     ---------------------------------------------------------- */
  function renderUser() {
    var user = getUser();
    if (!user) return;

    var displayName = user.name || 'Admin';
    var nameEl = document.getElementById('userName');
    var avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) {
      avatarEl.textContent = String(displayName).charAt(0).toUpperCase();
    }
  }

  /* ----------------------------------------------------------
     ANALYTICS
     ---------------------------------------------------------- */
  function renderAnalytics() {
    var wrap = document.getElementById('analyticsBars');
    if (!wrap) return;

    var counts = {};
    STATUS_LIST.forEach(function (s) { counts[s] = 0; });

    state.orders.forEach(function (o) {
      if (counts[o.status] != null) counts[o.status] += 1;
    });

    var values = STATUS_LIST.map(function (s) { return counts[s]; });
    var max = Math.max.apply(null, values) || 1;

    var html = STATUS_LIST.map(function (s) {
      var count = counts[s];
      var pct = Math.round((count / max) * 100);
      var label = STATUS_LABELS[s] || s;
      var cls = STATUS_CLASSES[s] || 'status-pending';

      return (
        '<div class="analytics-bar-row">' +
          '<span class="analytics-bar-label">' + escapeHtml(label) + '</span>' +
          '<div class="analytics-bar-track">' +
            '<div class="analytics-bar-fill ' + cls + '" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<span class="analytics-bar-value">' + count + '</span>' +
        '</div>'
      );
    }).join('');

    wrap.innerHTML = html;
  }

  /* ----------------------------------------------------------
     ORDERS — filtering
     ---------------------------------------------------------- */
  function matchesOrderQuery(order, query) {
    if (!query) return true;
    var hay = [
      order.order_number,
      order.full_name,
      order.email,
      order.phone,
      order.business_name,
      order.industry,
      order.location
    ].join(' ').toLowerCase();
    return hay.indexOf(query.toLowerCase()) !== -1;
  }

  function getFilteredOrders() {
    return state.orders.filter(function (o) {
      if (state.ordersStatus && o.status !== state.ordersStatus) return false;
      return matchesOrderQuery(o, state.ordersQuery);
    });
  }

  /* ----------------------------------------------------------
     ORDERS — render
     ---------------------------------------------------------- */
  function renderOrders() {
    var container = document.getElementById('ordersContainer');
    var emptyEl = document.getElementById('ordersEmpty');
    var subEl = document.getElementById('ordersSub');

    if (!container) return;

    var filtered = getFilteredOrders();

    if (subEl) {
      subEl.textContent = filtered.length + ' of ' + state.orders.length + ' orders';
    }

    if (!filtered.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    var html = filtered.map(function (o) {
      var statusCls = STATUS_CLASSES[o.status] || 'status-pending';
      var statusLabel = STATUS_LABELS[o.status] || o.status;
      var services = Array.isArray(o.services) ? o.services : [];

      var optionsHtml = STATUS_LIST.map(function (s) {
        var selected = s === o.status ? ' selected' : '';
        return '<option value="' + s + '"' + selected + '>' +
          escapeHtml(STATUS_LABELS[s]) +
          '</option>';
      }).join('');

      var servicesHtml = services.length
        ? '<div class="order-services">' +
            services.map(function (s) {
              return '<span class="order-service-chip">' + escapeHtml(s) + '</span>';
            }).join('') +
          '</div>'
        : '';

      var requirementsHtml = o.requirements
        ? '<details class="order-details">' +
            '<summary>View requirements</summary>' +
            '<p>' + escapeHtml(o.requirements) + '</p>' +
          '</details>'
        : '';

      return (
        '<article class="order-card order-card-admin" data-order-id="' + escapeHtml(o.id) + '">' +
          '<div class="order-card-head">' +
            '<div>' +
              '<div class="order-number">' + escapeHtml(o.order_number || '—') + '</div>' +
              '<div class="order-meta">' +
                escapeHtml(o.business_name || '—') + ' · ' + escapeHtml(o.industry || '—') +
              '</div>' +
            '</div>' +
            '<span class="status-pill ' + statusCls + '">' + escapeHtml(statusLabel) + '</span>' +
          '</div>' +

          '<div class="order-grid">' +
            '<div class="order-field">' +
              '<span class="order-field-label">Contact</span>' +
              '<span class="order-field-value">' + escapeHtml(o.full_name || '—') + '</span>' +
            '</div>' +
            '<div class="order-field">' +
              '<span class="order-field-label">Email</span>' +
              '<span class="order-field-value">' + escapeHtml(o.email || '—') + '</span>' +
            '</div>' +
            '<div class="order-field">' +
              '<span class="order-field-label">Phone</span>' +
              '<span class="order-field-value">' + escapeHtml(o.phone || '—') + '</span>' +
            '</div>' +
            '<div class="order-field">' +
              '<span class="order-field-label">Location</span>' +
              '<span class="order-field-value">' + escapeHtml(o.location || '—') + '</span>' +
            '</div>' +
            '<div class="order-field">' +
              '<span class="order-field-label">Preferred contact</span>' +
              '<span class="order-field-value">' + escapeHtml(o.contact_method || '—') + '</span>' +
            '</div>' +
            '<div class="order-field">' +
              '<span class="order-field-label">Submitted</span>' +
              '<span class="order-field-value">' + escapeHtml(formatDate(o.created_at)) + '</span>' +
            '</div>' +
          '</div>' +

          servicesHtml +
          requirementsHtml +

          '<div class="order-actions">' +
            '<label class="order-action-label">' +
              '<span>Update status</span>' +
              '<select class="input-field-sm order-status-select" data-order-id="' + escapeHtml(o.id) + '">' +
                optionsHtml +
              '</select>' +
            '</label>' +
            '<button type="button" class="btn btn-primary btn-sm order-save-btn" data-order-id="' + escapeHtml(o.id) + '">' +
              'Save' +
            '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    container.innerHTML = html;
    wireOrderSaveButtons();
  }

  function wireOrderSaveButtons() {
    $$('.order-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var oid = btn.getAttribute('data-order-id');
        var sel = document.querySelector('.order-status-select[data-order-id="' + oid + '"]');
        if (!sel) return;
        updateOrderStatus(oid, sel.value, btn);
      });
    });
  }

  /* ----------------------------------------------------------
     UPDATE ORDER STATUS
     ---------------------------------------------------------- */
  function updateOrderStatus(orderId, newStatus, btn) {
    if (!orderId || !newStatus) return;

    var originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving…';
    }

    authFetch('/api/admin/orders/' + orderId, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    })
      .then(function (res) {
        if (handleAuthFailure(res.status)) return;

        if (!res.ok) {
          throw new Error((res.data && res.data.error) || 'Update failed.');
        }

        var updated = res.data || {};

        // Update local state
        state.orders = state.orders.map(function (o) {
          if (String(o.id) === String(orderId)) {
            return Object.assign({}, o, updated, { status: newStatus });
          }
          return o;
        });

        renderOrders();
        renderAnalytics();
        updateStats();
      })
      .catch(function (err) {
        console.error('[admin] update failed:', err);
        if (btn) {
          btn.textContent = 'Error';
          setTimeout(function () {
            btn.textContent = originalText || 'Save';
          }, 1500);
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  /* ----------------------------------------------------------
     LEADS — filtering + render
     ---------------------------------------------------------- */
  function matchesLeadQuery(lead, query) {
    if (!query) return true;
    var hay = [
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.service,
      lead.source,
      lead.status
    ].join(' ').toLowerCase();
    return hay.indexOf(query.toLowerCase()) !== -1;
  }

  function getFilteredLeads() {
    return state.leads.filter(function (l) {
      return matchesLeadQuery(l, state.leadsQuery);
    });
  }

  function renderLeads() {
    var tbody = document.getElementById('leadsTableBody');
    var emptyEl = document.getElementById('leadsEmpty');
    var subEl = document.getElementById('leadsSub');

    if (!tbody) return;

    var filtered = getFilteredLeads();

    if (subEl) {
      subEl.textContent = filtered.length + ' of ' + state.leads.length + ' leads';
    }

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No leads match your search.</td></tr>';
      if (emptyEl) emptyEl.hidden = state.leads.length > 0;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    tbody.innerHTML = filtered.map(function (l) {
      var status = String(l.status || 'new').toLowerCase();
      var statusSafe = status.replace(/[^a-z0-9-]/g, '');

      return (
        '<tr>' +
          '<td><strong>' + escapeHtml(truncate(l.name, 40)) + '</strong></td>' +
          '<td>' + escapeHtml(truncate(l.email, 40)) + '</td>' +
          '<td>' + escapeHtml(l.phone || '—') + '</td>' +
          '<td>' + escapeHtml(truncate(l.company || '—', 30)) + '</td>' +
          '<td><span class="table-tag">' + escapeHtml(l.source || 'website') + '</span></td>' +
          '<td><span class="table-tag table-tag-' + statusSafe + '">' +
            escapeHtml(l.status || 'new') +
          '</span></td>' +
          '<td>' + escapeHtml(formatDate(l.created_at)) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  /* ----------------------------------------------------------
     STATS
     ---------------------------------------------------------- */
  function updateStats() {
    var ordersCount = state.orders.length;
    var leadsCount = state.leads.length;
    var liveCount = state.orders.filter(function (o) {
      return o.status === 'LIVE';
    }).length;

    setText('statOrders', ordersCount);
    setText('statLeads', leadsCount);
    setText('statLive', liveCount);
    setText('statMessages', 0);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  /* ----------------------------------------------------------
     DATA LOADING
     ---------------------------------------------------------- */
  function loadOrders() {
    return authFetch('/api/admin/orders', { method: 'GET' })
      .then(function (res) {
        if (handleAuthFailure(res.status)) return null;
        state.orders = (res.ok && Array.isArray(res.data)) ? res.data : [];
        renderOrders();
        renderAnalytics();
        updateStats();
        return res;
      })
      .catch(function (err) {
        console.error('[admin] loadOrders failed:', err);
        state.orders = [];
        renderOrders();
        renderAnalytics();
        updateStats();
      });
  }

  function loadLeads() {
    return authFetch('/api/admin/leads', { method: 'GET' })
      .then(function (res) {
        if (handleAuthFailure(res.status)) return null;
        state.leads = (res.ok && Array.isArray(res.data)) ? res.data : [];
        renderLeads();
        updateStats();
        return res;
      })
      .catch(function (err) {
        console.error('[admin] loadLeads failed:', err);
        state.leads = [];
        renderLeads();
        updateStats();
      });
  }

  function loadAll() {
    return Promise.all([loadOrders(), loadLeads()]);
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

    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshBtn.disabled = true;
        var original = refreshBtn.innerHTML;
        refreshBtn.innerHTML = 'Refreshing…';

        loadAll().then(function () {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = original;
        });
      });
    }
  }

  /* ----------------------------------------------------------
     FILTERS
     ---------------------------------------------------------- */
  function initFilters() {
    var ordersSearch = document.getElementById('ordersSearch');
    if (ordersSearch) {
      ordersSearch.addEventListener('input', function () {
        state.ordersQuery = ordersSearch.value.trim();
        renderOrders();
      });
    }

    var ordersFilter = document.getElementById('ordersFilter');
    if (ordersFilter) {
      ordersFilter.addEventListener('change', function () {
        state.ordersStatus = ordersFilter.value;
        renderOrders();
      });
    }

    var leadsSearch = document.getElementById('leadsSearch');
    if (leadsSearch) {
      leadsSearch.addEventListener('input', function () {
        state.leadsQuery = leadsSearch.value.trim();
        renderLeads();
      });
    }
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL FOR ANCHORS
     ---------------------------------------------------------- */
  function initSmoothNav() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href.length < 2) return;

        var target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
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
    initSmoothNav();

    if (!requireAdmin()) return;

    renderUser();
    initFilters();
    loadAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();