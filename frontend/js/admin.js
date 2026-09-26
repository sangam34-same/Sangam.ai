/* ============================================================
   SANGAM.AI — ADMIN CONSOLE (admin.js)
   Handles: admin guard, orders table, leads table, analytics,
            status updates, filters, refresh, toast.
   Works with: admin.html, api.js, main.js
   Exposes:   window.SangamAdmin = { state, loadAll, updateOrderStatus }
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE  = (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '';
  var TOKEN_KEY = 'sangam_token';
  var USER_KEY  = 'sangam_user';

  /* ----------------------------------------------------------
     STATUS MAPS
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
    orders: [],
    leads: [],
    ordersQuery:  '',
    ordersStatus: '',
    leadsQuery:   '',
    loading:      false,
    lastUpdated:  null
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

  function showToast(msg, type) {
    if (global.Sangam && typeof global.Sangam.showToast === 'function') {
      global.Sangam.showToast(msg, type);
    }
  }

  /* ----------------------------------------------------------
     STORAGE
     ---------------------------------------------------------- */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; }
    catch (e) { return ''; }
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setUser(user) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) { /* ignore */ }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
    } catch (e) { /* ignore */ }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ----------------------------------------------------------
     ADMIN GUARD — demo fallback (no login redirect)
     ---------------------------------------------------------- */
  function requireAdmin() {
    var token = getToken();
    var user  = getUser();

    // Demo mode: no session → seed a demo admin so the page works
    if (!token || !user) {
      setToken('demo-admin-token');
      setUser({
        name:  'Demo Admin',
        email: 'admin@sangam.ai',
        role:  'ADMIN'
      });
      return true;
    }

    // If logged in as a non-admin, still allow (this is a public command center
    // for the demo). In production, you'd redirect to dashboard.
    // if (user.role !== 'ADMIN') { window.location.href = 'dashboard.html'; return false; }

    return true;
  }

  /* ----------------------------------------------------------
     AUTHENTICATED FETCH
     ---------------------------------------------------------- */
  function authFetch(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + (getToken() || 'demo-admin-token');
    options.headers['Content-Type']  = 'application/json';

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
  function demoOrders() {
    var now = Date.now();
    return [
      {
        id: 1, order_number: 'SGM-10482',
        full_name: 'Rita Sharma', email: 'rita@brightsmile.com', phone: '+977 98XXXXXXXX',
        business_name: 'Bright Smile Dental', industry: 'Healthcare', location: 'Kathmandu, Nepal',
        status: 'DEVELOPMENT', contact_method: 'WHATSAPP',
        services: ['whatsapp-ai', 'booking', 'crm'],
        requirements: 'We want to automate WhatsApp enquiries, book appointments in Google Calendar, and sync every new lead to our CRM.',
        created_at: new Date(now - 7 * 86400000).toISOString()
      },
      {
        id: 2, order_number: 'SGM-10591',
        full_name: 'Anish Thapa', email: 'anish@himalayatravels.com', phone: '+977 98XXXXXXXX',
        business_name: 'Himalaya Travels', industry: 'Travel', location: 'Pokhara, Nepal',
        status: 'LIVE', contact_method: 'EMAIL',
        services: ['voice-receptionist', 'lead-gen'],
        requirements: 'AI receptionist to handle inbound calls 24/7 plus outbound lead qualification for tour packages.',
        created_at: new Date(now - 21 * 86400000).toISOString()
      },
      {
        id: 3, order_number: 'SGM-10703',
        full_name: 'Priya Gurung', email: 'priya@vertexrealty.com', phone: '+977 98XXXXXXXX',
        business_name: 'Vertex Realty', industry: 'Real Estate', location: 'Lalitpur, Nepal',
        status: 'DISCOVERY', contact_method: 'PHONE',
        services: ['chatbot', 'crm'],
        requirements: 'Website chatbot for property listings + automated CRM updates on every enquiry.',
        created_at: new Date(now - 2 * 86400000).toISOString()
      },
      {
        id: 4, order_number: 'SGM-10781',
        full_name: 'Bikash Rai', email: 'bikash@sagarmathafoods.com', phone: '+977 98XXXXXXXX',
        business_name: 'Sagarmatha Foods', industry: 'Ecommerce', location: 'Kathmandu, Nepal',
        status: 'TESTING', contact_method: 'EMAIL',
        services: ['email-ai', 'crm'],
        requirements: 'Automate inbound email replies and sync every order to our CRM.',
        created_at: new Date(now - 5 * 86400000).toISOString()
      },
      {
        id: 5, order_number: 'SGM-10892',
        full_name: 'Sita Karki', email: 'sita@lotusclinic.com', phone: '+977 98XXXXXXXX',
        business_name: 'Lotus Clinic', industry: 'Healthcare', location: 'Bhaktapur, Nepal',
        status: 'LIVE', contact_method: 'WHATSAPP',
        services: ['booking', 'whatsapp-ai'],
        requirements: 'Appointment booking agent integrated with WhatsApp and Google Calendar.',
        created_at: new Date(now - 14 * 86400000).toISOString()
      },
      {
        id: 6, order_number: 'SGM-10934',
        full_name: 'Maya Shrestha', email: 'maya@zenithretail.com', phone: '+977 98XXXXXXXX',
        business_name: 'Zenith Retail', industry: 'Ecommerce', location: 'Kathmandu, Nepal',
        status: 'REQUEST_RECEIVED', contact_method: 'EMAIL',
        services: ['chatbot', 'lead-gen', 'crm'],
        requirements: 'Website chatbot + lead-gen for product enquiries, synced to CRM.',
        created_at: new Date(now - 12 * 3600000).toISOString()
      }
    ];
  }

  function demoLeads() {
    var now = Date.now();
    return [
      { id: 1, name: 'Rita Sharma',   email: 'rita@brightsmile.com',       phone: '+977 98XXXXXXXX', company: 'Bright Smile Dental', source: 'contact_form', status: 'qualified', created_at: new Date(now -  3 * 86400000).toISOString() },
      { id: 2, name: 'Anish Thapa',   email: 'anish@himalayatravels.com',  phone: '+977 98XXXXXXXX', company: 'Himalaya Travels',    source: 'request_form', status: 'won',       created_at: new Date(now - 14 * 86400000).toISOString() },
      { id: 3, name: 'Priya Gurung',  email: 'priya@vertexrealty.com',     phone: '+977 98XXXXXXXX', company: 'Vertex Realty',       source: 'contact_form', status: 'new',       created_at: new Date(now -  1 * 86400000).toISOString() },
      { id: 4, name: 'Bikash Rai',    email: 'bikash@sagarmathafoods.com', phone: '+977 98XXXXXXXX', company: 'Sagarmatha Foods',    source: 'website',      status: 'contacted', created_at: new Date(now -  5 * 86400000).toISOString() },
      { id: 5, name: 'Sita Karki',    email: 'sita@lotusclinic.com',       phone: '+977 98XXXXXXXX', company: 'Lotus Clinic',        source: 'contact_form', status: 'qualified', created_at: new Date(now -  2 * 86400000).toISOString() },
      { id: 6, name: 'Maya Shrestha', email: 'maya@zenithretail.com',      phone: '+977 98XXXXXXXX', company: 'Zenith Retail',       source: 'website',      status: 'new',       created_at: new Date(now -  1 * 86400000).toISOString() },
      { id: 7, name: 'Ram Bahadur',   email: 'ram@nepaltreks.com',         phone: '+977 98XXXXXXXX', company: 'Nepal Treks',         source: 'request_form', status: 'lost',      created_at: new Date(now - 30 * 86400000).toISOString() }
    ];
  }

  /* ----------------------------------------------------------
     RENDER: USER
     ---------------------------------------------------------- */
  function renderUser() {
    var user = getUser();
    if (!user) return;

    var displayName = user.name || 'Admin';
    setText('userName', displayName);

    var avatarEl = document.getElementById('userAvatar');
    if (avatarEl) {
      avatarEl.textContent = String(displayName).charAt(0).toUpperCase();
    }
  }

  /* ----------------------------------------------------------
     RENDER: ANALYTICS
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

    wrap.innerHTML = STATUS_LIST.map(function (s) {
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

  /* ----------------------------------------------------------
     ORDERS — filtering
     ---------------------------------------------------------- */
  function matchesOrderQuery(order, q) {
    if (!q) return true;
    var hay = [
      order.order_number,
      order.full_name,
      order.email,
      order.phone,
      order.business_name,
      order.industry,
      order.location
    ].join(' ').toLowerCase();
    return hay.indexOf(q.toLowerCase()) !== -1;
  }

  function getFilteredOrders() {
    return state.orders.filter(function (o) {
      if (state.ordersStatus && o.status !== state.ordersStatus) return false;
      return matchesOrderQuery(o, state.ordersQuery);
    });
  }

  /* ----------------------------------------------------------
     RENDER: ORDERS
     ---------------------------------------------------------- */
  function renderOrders() {
    var container = document.getElementById('ordersContainer');
    var emptyEl   = document.getElementById('ordersEmpty');
    var subEl     = document.getElementById('ordersSub');
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
      var statusCls   = STATUS_CLASSES[o.status] || 'status-pending';
      var statusLabel = STATUS_LABELS[o.status] || o.status;
      var services    = Array.isArray(o.services) ? o.services : [];

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
        '<article class="order-card" data-order-id="' + escapeHtml(o.id) + '">' +
          '<div class="order-card-head">' +
            '<div>' +
              '<div class="order-number">' + escapeHtml(o.order_number || '—') + '</div>' +
              '<div class="order-meta">' +
                escapeHtml(o.business_name || '—') +
                ' · ' +
                escapeHtml(o.industry || '—') +
              '</div>' +
            '</div>' +
            '<span class="status-pill ' + statusCls + '">' + escapeHtml(statusLabel) + '</span>' +
          '</div>' +

          '<div class="order-grid">' +
            '<div class="order-field"><span class="order-field-label">Contact</span><span class="order-field-value">' + escapeHtml(o.full_name || '—') + '</span></div>' +
            '<div class="order-field"><span class="order-field-label">Email</span><span class="order-field-value">' + escapeHtml(o.email || '—') + '</span></div>' +
            '<div class="order-field"><span class="order-field-label">Phone</span><span class="order-field-value">' + escapeHtml(o.phone || '—') + '</span></div>' +
            '<div class="order-field"><span class="order-field-label">Location</span><span class="order-field-value">' + escapeHtml(o.location || '—') + '</span></div>' +
            '<div class="order-field"><span class="order-field-label">Preferred contact</span><span class="order-field-value">' + escapeHtml(o.contact_method || '—') + '</span></div>' +
            '<div class="order-field"><span class="order-field-label">Submitted</span><span class="order-field-value">' + escapeHtml(formatDate(o.created_at)) + '</span></div>' +
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
            '<button type="button" class="btn btn-primary btn-sm order-save-btn" data-order-id="' + escapeHtml(o.id) + '">Save</button>' +
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

    authFetch('/api/admin/orders/' + encodeURIComponent(orderId), {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    })
      .then(function (res) {
        if (!res.ok && !res.networkError) {
          throw new Error((res.data && res.data.error) || 'Update failed.');
        }

        // Update local state regardless (demo mode tolerant)
        var updated = (res.data && typeof res.data === 'object') ? res.data : {};
        state.orders = state.orders.map(function (o) {
          if (String(o.id) === String(orderId)) {
            return Object.assign({}, o, updated, { status: newStatus });
          }
          return o;
        });

        renderOrders();
        renderAnalytics();
        updateStats();

        showToast('Order status updated to ' + (STATUS_LABELS[newStatus] || newStatus), 'success');
      })
      .catch(function (err) {
        if (global.console && console.error) {
          console.error('[admin] updateOrderStatus failed:', err);
        }
        showToast((err && err.message) || 'Failed to update status.', 'error');
        if (btn) btn.textContent = 'Error';
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          setTimeout(function () {
            btn.textContent = originalText || 'Save';
          }, 400);
        }
      });
  }

  /* ----------------------------------------------------------
     LEADS — filtering + render
     ---------------------------------------------------------- */
  function matchesLeadQuery(lead, q) {
    if (!q) return true;
    var hay = [
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.service,
      lead.source,
      lead.status
    ].join(' ').toLowerCase();
    return hay.indexOf(q.toLowerCase()) !== -1;
  }

  function getFilteredLeads() {
    return state.leads.filter(function (l) {
      return matchesLeadQuery(l, state.leadsQuery);
    });
  }

  function renderLeads() {
    var tbody   = document.getElementById('leadsTableBody');
    var emptyEl = document.getElementById('leadsEmpty');
    var subEl   = document.getElementById('leadsSub');
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
            escapeHtml(l.status || 'new') + '</span></td>' +
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
    var leadsCount  = state.leads.length;
    var liveCount   = state.orders.filter(function (o) {
      return o.status === 'LIVE';
    }).length;

    setText('statOrders', ordersCount);
    setText('statLeads',  leadsCount);
    setText('statLive',   liveCount);
    setText('statMessages', state.leads.filter(function (l) {
      return String(l.source || '').indexOf('contact') !== -1;
    }).length);
  }

  /* ----------------------------------------------------------
     DATA LOADING
     ---------------------------------------------------------- */
  function loadOrders() {
    return authFetch('/api/admin/orders', { method: 'GET' })
      .then(function (res) {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          state.orders = res.data;
        } else if (res.ok && Array.isArray(res.data)) {
          state.orders = res.data.length ? res.data : demoOrders();
        } else {
          state.orders = demoOrders();
        }
        renderOrders();
        renderAnalytics();
        updateStats();
      })
      .catch(function () {
        state.orders = demoOrders();
        renderOrders();
        renderAnalytics();
        updateStats();
      });
  }

  function loadLeads() {
    return authFetch('/api/admin/leads', { method: 'GET' })
      .then(function (res) {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          state.leads = res.data;
        } else if (res.ok && Array.isArray(res.data)) {
          state.leads = res.data.length ? res.data : demoLeads();
        } else {
          state.leads = demoLeads();
        }
        renderLeads();
        updateStats();
      })
      .catch(function () {
        state.leads = demoLeads();
        renderLeads();
        updateStats();
      });
  }

  function loadAll() {
    if (state.loading) return Promise.resolve();
    state.loading = true;

    return Promise.all([loadOrders(), loadLeads()])
      .then(function () {
        state.lastUpdated = new Date();
        var lu = document.getElementById('lastUpdated');
        if (lu) {
          lu.textContent = 'Updated ' + state.lastUpdated.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
          });
        }
      })
      .catch(function (err) {
        if (global.console && console.error) {
          console.error('[admin] loadAll failed:', err);
        }
      })
      .finally(function () {
        state.loading = false;
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
    var navLinks  = document.getElementById('navLinks');

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
      });

      $$('a', navLinks).forEach(function (a) {
        a.addEventListener('click', function () {
          if (window.innerWidth < 960) {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });

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

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ----------------------------------------------------------
     USER MENU
     ---------------------------------------------------------- */
  function initUserMenu() {
    var userBtn      = document.getElementById('userBtn');
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
        if (refreshBtn.disabled) return;
        refreshBtn.disabled = true;
        var original = refreshBtn.innerHTML;
        refreshBtn.innerHTML = 'Refreshing…';

        loadAll().finally(function () {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = original;
          showToast('Admin console refreshed', 'success');
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
    if (el && !el.textContent) el.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  global.SangamAdmin = {
    state: state,
    loadAll: loadAll,
    updateOrderStatus: updateOrderStatus,
    renderOrders: renderOrders,
    renderLeads: renderLeads,
    renderAnalytics: renderAnalytics
  };

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    // Only run on the admin page
    if (!document.querySelector('.dashboard-main') && !document.getElementById('statOrders')) return;

    document.documentElement.classList.add('js-ready');

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

})(window);