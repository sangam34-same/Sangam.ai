/* ============================================================
   SANGAM.AI — COMMAND CENTER DASHBOARD (dashboard.js)
   Handles: stats, bookings, products, orders, leads, analytics,
            tabs, filters, refresh, demo session, toast.
   Works with: dashboard.html, api.js, main.js
   Exposes:   window.SangamDashboard = { state, loadAll, refresh }
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '';
  var TOKEN_KEY = 'sangam_token';
  var USER_KEY  = 'sangam_user';

  /* ----------------------------------------------------------
     STATUS MAPS (for orders)
     ---------------------------------------------------------- */
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
    DISCOVERY:        'Discovery',
    DEVELOPMENT:      'Development',
    TESTING:          'Testing',
    DEPLOYMENT:       'Deployment',
    LIVE:             'Live',
    CANCELLED:        'Cancelled'
  };

  var STATUS_CLASSES = {
    REQUEST_RECEIVED: 'status-pending',
    DISCOVERY:        'status-progress',
    DEVELOPMENT:      'status-progress',
    TESTING:          'status-progress',
    DEPLOYMENT:       'status-progress',
    LIVE:             'status-live',
    CANCELLED:        'status-cancelled'
  };

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  var state = {
    bookings: [],
    products: [],
    orders: [],
    leads: [],
    loading: false,
    lastUpdated: null
  };

  /* ----------------------------------------------------------
     DOM HELPERS
     ---------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(v);
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

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) { return '—'; }
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function formatDay(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
    } catch (e) { return ''; }
  }

  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    var first = (parts[0] || '?').charAt(0);
    var second = parts[1] ? parts[1].charAt(0) : '';
    return (first + second).toUpperCase();
  }

  function showToast(msg, type) {
    if (global.Sangam && typeof global.Sangam.showToast === 'function') {
      global.Sangam.showToast(msg, type);
    }
  }

  /* ----------------------------------------------------------
     DEMO SESSION — bypasses login (no redirect)
     ---------------------------------------------------------- */
  function ensureDemoSession() {
    try {
      if (!localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(TOKEN_KEY, 'demo-dashboard-token');
      }
      if (!localStorage.getItem(USER_KEY)) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          name: 'Sangam Operator',
          email: 'ops@sangam.ai',
          role: 'ADMIN'
        }));
      }
    } catch (e) { /* ignore */ }
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || 'demo-dashboard-token'; }
    catch (e) { return 'demo-dashboard-token'; }
  }

  /* ----------------------------------------------------------
     AUTHENTICATED FETCH
     ---------------------------------------------------------- */
  function authFetch(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + getToken();
    options.headers['Content-Type'] = 'application/json';

    return fetch(API_BASE + path, options)
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          if (text) {
            try { data = JSON.parse(text); } catch (e) { data = text; }
          }
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .catch(function (err) {
        return { ok: false, status: 0, data: null, networkError: true, error: err };
      });
  }

  /* ----------------------------------------------------------
     DEMO DATA FALLBACKS
     ---------------------------------------------------------- */
  function demoBookings() {
    var now = Date.now();
    return [
      { id: 'BK-1001', name: 'Rita Sharma',  email: 'rita@brightsmile.com',      phone: '+977 98XXXXXXXX', company: 'Bright Smile Dental', service: 'WhatsApp AI Agent',          date: new Date(now + 2 * 86400000).toISOString(), status: 'CONFIRMED' },
      { id: 'BK-1002', name: 'Anish Thapa',  email: 'anish@himalayatravels.com', phone: '+977 98XXXXXXXX', company: 'Himalaya Travels',    service: 'Voice AI Receptionist',       date: new Date(now + 1 * 86400000).toISOString(), status: 'PENDING' },
      { id: 'BK-1003', name: 'Priya Gurung', email: 'priya@vertexrealty.com',    phone: '+977 98XXXXXXXX', company: 'Vertex Realty',       service: 'AI Chatbot',                  date: new Date(now + 3 * 86400000).toISOString(), status: 'CONFIRMED' },
      { id: 'BK-1004', name: 'Bikash Rai',   email: 'bikash@sagarmathafoods.com',phone: '+977 98XXXXXXXX', company: 'Sagarmatha Foods',    service: 'CRM Automation',              date: new Date(now - 1 * 86400000).toISOString(), status: 'COMPLETED' },
      { id: 'BK-1005', name: 'Sita Karki',   email: 'sita@lotusclinic.com',      phone: '+977 98XXXXXXXX', company: 'Lotus Clinic',        service: 'Appointment Booking Agent',   date: new Date(now + 5 * 86400000).toISOString(), status: 'PENDING' }
    ];
  }

  function demoProducts() {
    return [
      { id: 1, name: 'WhatsApp AI Agent',         icon: '💬', tag: 'LIVE', price: '$99',     sales: 142, description: 'Automate WhatsApp replies, bookings and support.' },
      { id: 2, name: 'Voice AI Receptionist',     icon: '📞', tag: 'LIVE', price: '$199',    sales: 87,  description: '24/7 inbound call handling with booking.' },
      { id: 3, name: 'Instagram AI Agent',        icon: '📷', tag: 'BETA', price: '$79',     sales: 54,  description: 'Auto-reply to DMs, comments and mentions.' },
      { id: 4, name: 'AI Chatbot',                icon: '🤖', tag: 'LIVE', price: '$69',     sales: 203, description: 'RAG-powered website chat that converts.' },
      { id: 5, name: 'CRM Automation',            icon: '🗂️', tag: 'NEW',  price: '$129',    sales: 76,  description: 'Auto-tag, sync and pipeline every lead.' },
      { id: 6, name: 'Lead Generation Agent',     icon: '🎯', tag: 'LIVE', price: '$149',    sales: 118, description: 'Finds, qualifies and nurtures leads for you.' },
      { id: 7, name: 'Appointment Booking Agent', icon: '📅', tag: 'LIVE', price: '$89',     sales: 91,  description: 'Calendar sync, confirmations and reminders.' },
      { id: 8, name: 'Custom AI Agent',           icon: '⚡', tag: 'NEW',  price: 'Custom',  sales: 24,  description: 'Bespoke agents trained on your business.' }
    ];
  }

  function demoOrders() {
    var now = Date.now();
    return [
      { id: 1, order_number: 'SGM-10482', business_name: 'Bright Smile Dental', industry: 'Healthcare',  status: 'DEVELOPMENT', services: ['whatsapp-ai', 'booking', 'crm'],   created_at: new Date(now -  7 * 86400000).toISOString() },
      { id: 2, order_number: 'SGM-10591', business_name: 'Himalaya Travels',    industry: 'Travel',      status: 'LIVE',        services: ['voice-receptionist', 'lead-gen'],      created_at: new Date(now - 21 * 86400000).toISOString() },
      { id: 3, order_number: 'SGM-10703', business_name: 'Vertex Realty',       industry: 'Real Estate', status: 'DISCOVERY',   services: ['chatbot', 'crm'],                      created_at: new Date(now -  2 * 86400000).toISOString() },
      { id: 4, order_number: 'SGM-10781', business_name: 'Sagarmatha Foods',    industry: 'Ecommerce',   status: 'TESTING',     services: ['email-ai', 'crm'],                     created_at: new Date(now -  5 * 86400000).toISOString() },
      { id: 5, order_number: 'SGM-10892', business_name: 'Lotus Clinic',        industry: 'Healthcare',  status: 'LIVE',        services: ['booking', 'whatsapp-ai'],              created_at: new Date(now - 14 * 86400000).toISOString() }
    ];
  }

  function demoLeads() {
    var now = Date.now();
    return [
      { id: 1, name: 'Rita Sharma',  email: 'rita@brightsmile.com',       phone: '+977 98XXXXXXXX', company: 'Bright Smile Dental', source: 'contact_form', status: 'qualified', created_at: new Date(now -  3 * 86400000).toISOString() },
      { id: 2, name: 'Anish Thapa',  email: 'anish@himalayatravels.com',  phone: '+977 98XXXXXXXX', company: 'Himalaya Travels',    source: 'request_form', status: 'won',       created_at: new Date(now - 14 * 86400000).toISOString() },
      { id: 3, name: 'Priya Gurung', email: 'priya@vertexrealty.com',     phone: '+977 98XXXXXXXX', company: 'Vertex Realty',       source: 'contact_form', status: 'new',       created_at: new Date(now -  1 * 86400000).toISOString() },
      { id: 4, name: 'Bikash Rai',   email: 'bikash@sagarmathafoods.com', phone: '+977 98XXXXXXXX', company: 'Sagarmatha Foods',    source: 'website',      status: 'contacted', created_at: new Date(now -  5 * 86400000).toISOString() },
      { id: 5, name: 'Sita Karki',   email: 'sita@lotusclinic.com',       phone: '+977 98XXXXXXXX', company: 'Lotus Clinic',        source: 'contact_form', status: 'qualified', created_at: new Date(now -  2 * 86400000).toISOString() }
    ];
  }

  /* ----------------------------------------------------------
     RENDER: BOOKINGS
     ---------------------------------------------------------- */
  function renderBookings(list) {
    var wrap = $('#bookingsList');
    var empty = $('#bookingsEmpty');
    var countEl = $('#countBookings');
    if (!wrap) return;

    if (!Array.isArray(list) || !list.length) {
      wrap.innerHTML = '';
      if (empty) empty.hidden = false;
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (empty) empty.hidden = true;
    if (countEl) countEl.textContent = String(list.length);

    var avatarClasses = ['purple', 'green', 'pink', 'cyan', 'amber'];
    var statusMap = {
      CONFIRMED: { cls: 'status-confirmed', label: 'Confirmed' },
      PENDING:   { cls: 'status-pending',   label: 'Pending'   },
      COMPLETED: { cls: 'status-completed', label: 'Completed' },
      CANCELLED: { cls: 'status-cancelled', label: 'Cancelled' }
    };

    wrap.innerHTML = list.map(function (b, i) {
      var avatarCls = avatarClasses[i % avatarClasses.length];
      var stKey = String(b.status || 'PENDING').toUpperCase();
      var st = statusMap[stKey] || statusMap.PENDING;

      return (
        '<article class="booking-card">' +
          '<div class="booking-avatar booking-avatar-' + avatarCls + '">' +
            escapeHtml(initials(b.name)) +
          '</div>' +
          '<div class="booking-info">' +
            '<div class="booking-name">' +
              escapeHtml(b.name || '—') +
              '<span class="booking-status ' + st.cls + '">' + st.label + '</span>' +
            '</div>' +
            '<div class="booking-meta">' +
              '<span class="booking-meta-item">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>' +
                escapeHtml(truncate(b.email, 30)) +
              '</span>' +
              '<span class="booking-meta-item">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg>' +
                escapeHtml(b.phone || '—') +
              '</span>' +
              (b.company ? '<span class="booking-meta-item">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>' +
                escapeHtml(b.company) + '</span>' : '') +
              (b.service ? '<span class="booking-meta-item">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z"/></svg>' +
                escapeHtml(b.service) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="booking-time">' +
            '<div class="booking-time-day">' + escapeHtml(formatDay(b.date)) + '</div>' +
            '<div class="booking-time-hour">' + escapeHtml(formatTime(b.date)) + '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  /* ----------------------------------------------------------
     RENDER: PRODUCTS
     ---------------------------------------------------------- */
  function renderProducts(list) {
    var grid = $('#productsGrid');
    var empty = $('#productsEmpty');
    var countEl = $('#countProducts');
    if (!grid) return;

    if (!Array.isArray(list) || !list.length) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (empty) empty.hidden = true;
    if (countEl) countEl.textContent = String(list.length);

    var tagMap = { LIVE: 'tag-live', BETA: 'tag-beta', NEW: 'tag-new' };

    grid.innerHTML = list.map(function (p) {
      var tagKey = String(p.tag || 'LIVE').toUpperCase();
      var tagCls = tagMap[tagKey] || '';
      return (
        '<article class="product-card">' +
          '<div class="product-head">' +
            '<div class="product-icon">' + escapeHtml(p.icon || '🧩') + '</div>' +
            '<span class="product-tag ' + tagCls + '">' + escapeHtml(p.tag || 'LIVE') + '</span>' +
          '</div>' +
          '<h3 class="product-name">' + escapeHtml(p.name) + '</h3>' +
          '<p class="product-desc">' + escapeHtml(p.description || '') + '</p>' +
          '<div class="product-stats">' +
            '<span class="product-price">' + escapeHtml(p.price || '—') + '</span>' +
            '<span class="product-sales"><strong>' + escapeHtml(p.sales || 0) + '</strong> sold</span>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  /* ----------------------------------------------------------
     RENDER: ORDERS
     ---------------------------------------------------------- */
  function renderOrders(list) {
    var wrap = $('#ordersList');
    var empty = $('#ordersEmpty');
    var countEl = $('#countOrders');
    if (!wrap) return;

    if (!Array.isArray(list) || !list.length) {
      wrap.innerHTML = '';
      if (empty) empty.hidden = false;
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (empty) empty.hidden = true;
    if (countEl) countEl.textContent = String(list.length);

    wrap.innerHTML = list.map(function (o) {
      var cls = STATUS_CLASSES[o.status] || 'status-pending';
      var label = STATUS_LABELS[o.status] || o.status;
      var services = Array.isArray(o.services) ? o.services : [];

      return (
        '<article class="booking-card">' +
          '<div class="booking-avatar booking-avatar-purple">📦</div>' +
          '<div class="booking-info">' +
            '<div class="booking-name">' +
              escapeHtml(o.order_number || '—') +
              '<span class="booking-status ' + cls + '">' + escapeHtml(label) + '</span>' +
            '</div>' +
            '<div class="booking-meta">' +
              '<span class="booking-meta-item">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>' +
                escapeHtml(o.business_name || '—') +
              '</span>' +
              (o.industry ? '<span class="booking-meta-item">🏷️ ' + escapeHtml(o.industry) + '</span>' : '') +
              (services.length ? '<span class="booking-meta-item">🧩 ' + escapeHtml(services.join(', ')) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="booking-time">' +
            '<div class="booking-time-day">SUBMITTED</div>' +
            '<div class="booking-time-hour">' + escapeHtml(formatDate(o.created_at)) + '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  /* ----------------------------------------------------------
     RENDER: LEADS
     ---------------------------------------------------------- */
  function renderLeads(list) {
    var tbody = $('#leadsTableBody');
    var empty = $('#leadsEmpty');
    var countEl = $('#countLeads');
    if (!tbody) return;

    if (!Array.isArray(list) || !list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No leads yet.</td></tr>';
      if (empty) empty.hidden = false;
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (empty) empty.hidden = true;
    if (countEl) countEl.textContent = String(list.length);

    tbody.innerHTML = list.map(function (l) {
      var status = String(l.status || 'new').toLowerCase();
      var statusSafe = status.replace(/[^a-z0-9-]/g, '');

      return (
        '<tr>' +
          '<td><strong>' + escapeHtml(truncate(l.name, 40)) + '</strong></td>' +
          '<td>' + escapeHtml(truncate(l.email, 40)) + '</td>' +
          '<td>' + escapeHtml(l.phone || '—') + '</td>' +
          '<td>' + escapeHtml(truncate(l.company || '—', 30)) + '</td>' +
          '<td><span class="table-tag">' + escapeHtml(l.source || 'website') + '</span></td>' +
          '<td><span class="table-tag table-tag-' + statusSafe + '">' + escapeHtml(l.status || 'new') + '</span></td>' +
          '<td>' + escapeHtml(formatDate(l.created_at)) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  /* ----------------------------------------------------------
     RENDER: ANALYTICS (donut + bars)
     ---------------------------------------------------------- */
  function renderAnalytics() {
    var total = state.bookings.length + state.products.length +
                state.orders.length   + state.leads.length;

    var segs = [
      { label: 'Demo Bookings',   value: state.bookings.length, color: '#8b5cf6' },
      { label: 'Active Products', value: state.products.length, color: '#06b6d4' },
      { label: 'Orders',          value: state.orders.length,   color: '#10b981' },
      { label: 'Leads',           value: state.leads.length,    color: '#ec4899' }
    ];

    // Donut chart via CSS custom properties
    var totalSafe = Math.max(total, 1);
    var seg1 = (segs[0].value / totalSafe) * 360;
    var seg2 = seg1 + (segs[1].value / totalSafe) * 360;
    var seg3 = seg2 + (segs[2].value / totalSafe) * 360;

    var donut = $('#donutChart');
    if (donut) {
      donut.style.setProperty('--seg1', seg1.toFixed(2) + 'deg');
      donut.style.setProperty('--seg2', seg2.toFixed(2) + 'deg');
      donut.style.setProperty('--seg3', seg3.toFixed(2) + 'deg');
      donut.style.setProperty('--seg4', '360deg');
    }

    var donutTotal = $('#donutTotal');
    if (donutTotal) donutTotal.textContent = String(total);

    // Legend
    var legend = $('#donutLegend');
    if (legend) {
      legend.innerHTML = segs.map(function (s) {
        var pct = total ? Math.round((s.value / total) * 100) : 0;
        return (
          '<div class="legend-row">' +
            '<span class="legend-label">' +
              '<span class="legend-dot" style="background:' + s.color + ';box-shadow:0 0 10px ' + s.color + '"></span>' +
              escapeHtml(s.label) +
            '</span>' +
            '<span class="legend-value">' + s.value +
              ' <span style="color:var(--text-4);font-size:11px">(' + pct + '%)</span>' +
            '</span>' +
          '</div>'
        );
      }).join('');
    }

    // Order status bars
    var bars = $('#analyticsBars');
    if (bars) {
      var counts = {};
      STATUS_LIST.forEach(function (s) { counts[s] = 0; });
      state.orders.forEach(function (o) {
        if (counts[o.status] != null) counts[o.status] += 1;
      });

      var values = STATUS_LIST.map(function (s) { return counts[s]; });
      var max = Math.max.apply(null, values) || 1;

      bars.innerHTML = STATUS_LIST.map(function (s) {
        var c = counts[s];
        var pct = Math.round((c / max) * 100);
        var label = STATUS_LABELS[s] || s;
        var cls = STATUS_CLASSES[s] || 'status-pending';
        return (
          '<div class="analytics-bar-row">' +
            '<span class="analytics-bar-label">' + escapeHtml(label) + '</span>' +
            '<div class="analytics-bar-track">' +
              '<div class="analytics-bar-fill ' + cls + '" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<span class="analytics-bar-value">' + c + '</span>' +
          '</div>'
        );
      }).join('');
    }
  }

  /* ----------------------------------------------------------
     UPDATE STAT CARDS
     ---------------------------------------------------------- */
  function updateStats() {
    var liveCount = state.orders.filter(function (o) {
      return o.status === 'LIVE';
    }).length;

    var newLeads = state.leads.filter(function (l) {
      return String(l.status || '').toLowerCase() === 'new';
    }).length;

    setText('statBookings', state.bookings.length);
    setText('statProducts', state.products.length);
    setText('statLive',     liveCount);
    setText('statLeads',    newLeads || state.leads.length);
  }

  /* ----------------------------------------------------------
     UPDATE LAST UPDATED PILL
     ---------------------------------------------------------- */
  function updateTimestamp() {
    var lu = $('#lastUpdated');
    if (!lu) return;
    state.lastUpdated = new Date();
    lu.textContent = 'Updated ' + state.lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  /* ----------------------------------------------------------
     LOADERS
     ---------------------------------------------------------- */
  function loadBookings() {
    return authFetch('/api/admin/appointments', { method: 'GET' })
      .then(function (res) {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          state.bookings = res.data;
        } else {
          state.bookings = demoBookings();
        }
        renderBookings(state.bookings);
      })
      .catch(function () {
        state.bookings = demoBookings();
        renderBookings(state.bookings);
      });
  }

  function loadProducts() {
    return authFetch('/api/services', { method: 'GET' })
      .then(function (res) {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          state.products = res.data.map(function (s, i) {
            return {
              id: s.id || i,
              name: s.name,
              icon: s.icon || '🧩',
              tag: s.tag || (i % 3 === 0 ? 'LIVE' : i % 3 === 1 ? 'BETA' : 'NEW'),
              price: s.price ? ('$' + (s.price / 100).toFixed(0)) : (i % 2 === 0 ? '$99' : '$149'),
              sales: s.sales || Math.floor(50 + Math.random() * 200),
              description: s.description || ''
            };
          });
        } else {
          state.products = demoProducts();
        }
        renderProducts(state.products);
      })
      .catch(function () {
        state.products = demoProducts();
        renderProducts(state.products);
      });
  }

  function loadOrders() {
    return authFetch('/api/admin/orders', { method: 'GET' })
      .then(function (res) {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          state.orders = res.data;
        } else {
          state.orders = demoOrders();
        }
        renderOrders(state.orders);
      })
      .catch(function () {
        state.orders = demoOrders();
        renderOrders(state.orders);
      });
  }

  function loadLeads() {
    return authFetch('/api/admin/leads', { method: 'GET' })
      .then(function (res) {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          state.leads = res.data;
        } else {
          state.leads = demoLeads();
        }
        renderLeads(state.leads);
      })
      .catch(function () {
        state.leads = demoLeads();
        renderLeads(state.leads);
      });
  }

  function loadAll() {
    if (state.loading) return Promise.resolve();
    state.loading = true;

    return Promise.all([
      loadBookings(),
      loadProducts(),
      loadOrders(),
      loadLeads()
    ])
      .then(function () {
        updateStats();
        renderAnalytics();
        updateTimestamp();
      })
      .catch(function (err) {
        if (global.console && console.error) {
          console.error('[dashboard] loadAll failed:', err);
        }
      })
      .finally(function () {
        state.loading = false;
      });
  }

  /* ----------------------------------------------------------
     TABS
     ---------------------------------------------------------- */
  function wireTabs() {
    var btns = $$('.tab-btn');
    var panels = $$('.tab-panel');
    if (!btns.length) return;

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        btns.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', String(active));
        });
        panels.forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-panel') === target);
        });
      });
    });
  }

  /* ----------------------------------------------------------
     REFRESH BUTTON
     ---------------------------------------------------------- */
  function wireRefresh() {
    var btn = $('#refreshBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true;
      var original = btn.innerHTML;
      btn.innerHTML = 'Refreshing…';
      loadAll().finally(function () {
        btn.disabled = false;
        btn.innerHTML = original;
        showToast('Dashboard refreshed', 'success');
      });
    });
  }

  /* ----------------------------------------------------------
     REVEAL ANIMATIONS
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

    setTimeout(function () {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('visible');
        }
      });
    }, 2000);
  }

  /* ----------------------------------------------------------
     AUTO-REFRESH (pauses when tab is hidden)
     ---------------------------------------------------------- */
  var autoRefreshTimer = null;
  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(function () {
      if (!document.hidden) {
        loadAll();
      }
    }, 60000); // every 60s
  }
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }
  function wireVisibility() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopAutoRefresh();
      } else {
        startAutoRefresh();
      }
    });
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  global.SangamDashboard = {
    state: state,
    loadAll: loadAll,
    refresh: loadAll,
    startAutoRefresh: startAutoRefresh,
    stopAutoRefresh: stopAutoRefresh
  };

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    // Only run on the dashboard page
    if (!document.querySelector('.dashboard-main')) return;

    document.documentElement.classList.add('js-ready');

    ensureDemoSession();
    initReveal();
    wireTabs();
    wireRefresh();
    wireVisibility();

    loadAll().then(function () {
      startAutoRefresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);