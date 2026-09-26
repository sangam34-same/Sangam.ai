/* ============================================================
   SANGAM.AI — API CLIENT (api.js)
   Central fetch wrapper + auth token storage + endpoint helpers.
   Works with: every page in the project.
   Exposes:   window.api  AND  window.Sangam.api
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var CONFIG = {
    API_BASE:
      (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '',
    APP_NAME:
      (global.SANGAM_CONFIG && global.SANGAM_CONFIG.APP_NAME) || 'Sangam.ai',
    TOKEN_KEY: 'sangam_token',
    USER_KEY:  'sangam_user',
    DEFAULT_TIMEOUT_MS: 20000,
    DEFAULT_HEADERS: {
      'Accept': 'application/json'
    }
  };

  /* ----------------------------------------------------------
     STORAGE HELPERS
     ---------------------------------------------------------- */
  function getToken() {
    try { return localStorage.getItem(CONFIG.TOKEN_KEY) || ''; }
    catch (e) { return ''; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(CONFIG.TOKEN_KEY, token);
      else localStorage.removeItem(CONFIG.TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setUser(user) {
    try {
      if (user) localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(CONFIG.USER_KEY);
    } catch (e) { /* ignore */ }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      localStorage.removeItem(CONFIG.USER_KEY);
    } catch (e) { /* ignore */ }
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function isAdmin() {
    var user = getUser();
    return Boolean(user && user.role === 'ADMIN');
  }

  /* ----------------------------------------------------------
     RESPONSE NORMALIZER
     Every response is { ok, status, data } OR
     { ok:false, status:0, data:{error}, networkError:true }
     ---------------------------------------------------------- */
  function normalizeResponse(response) {
    return response.text().then(function (text) {
      var data = null;
      if (text) {
        try { data = JSON.parse(text); }
        catch (e) { data = text; }
      }
      return {
        ok: response.ok,
        status: response.status,
        data: data
      };
    }, function () {
      return {
        ok: response.ok,
        status: response.status,
        data: null
      };
    });
  }

  /* ----------------------------------------------------------
     REQUEST CORE
     ---------------------------------------------------------- */
  function request(path, options) {
    options = options || {};

    // Ensure path starts with a slash when API_BASE is set
    var url = CONFIG.API_BASE + path;
    var method = String(options.method || 'GET').toUpperCase();

    var headers = Object.assign({}, CONFIG.DEFAULT_HEADERS, options.headers || {});

    // Attach auth token unless explicitly skipped
    if (!options.skipAuth) {
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    // Serialize plain-object bodies as JSON
    var body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    // Build fetch options
    var fetchOptions = {
      method: method,
      headers: headers,
      body: body,
      credentials: options.credentials || 'omit'
    };

    // Optional timeout via AbortController
    var controller = null;
    var timeoutId = null;
    var timeoutMs = options.timeout === 0 ? 0 : (options.timeout || CONFIG.DEFAULT_TIMEOUT_MS);

    if (timeoutMs > 0 && typeof AbortController !== 'undefined') {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(function () {
        try { controller.abort(); } catch (e) { /* ignore */ }
      }, timeoutMs);
    }

    return fetch(url, fetchOptions)
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        return normalizeResponse(res);
      })
      .catch(function (err) {
        if (timeoutId) clearTimeout(timeoutId);

        var message = 'Network error';
        if (err && err.name === 'AbortError') {
          message = 'Request timed out';
        } else if (err && err.message) {
          message = err.message;
        }

        return {
          ok: false,
          status: 0,
          data: { error: message },
          networkError: true,
          error: err
        };
      });
  }

  /* ----------------------------------------------------------
     AUTH-AWARE REQUEST
     Clears session + dispatches an event if 401 is received
     ---------------------------------------------------------- */
  function authRequest(path, options) {
    return request(path, options).then(function (res) {
      if (res.status === 401) {
        clearAuth();
        try {
          document.dispatchEvent(new CustomEvent('sangam:unauthorized'));
        } catch (e) { /* ignore */ }
      }
      return res;
    });
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  var api = {
    /* Config & storage */
    config: CONFIG,
    getToken: getToken,
    setToken: setToken,
    getUser: getUser,
    setUser: setUser,
    clearAuth: clearAuth,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,

    /* Raw request helpers */
    request: request,
    get: function (path, opts) {
      opts = opts || {};
      opts.method = 'GET';
      return request(path, opts);
    },
    post: function (path, body, opts) {
      opts = opts || {};
      opts.method = 'POST';
      opts.body = body;
      return request(path, opts);
    },
    put: function (path, body, opts) {
      opts = opts || {};
      opts.method = 'PUT';
      opts.body = body;
      return request(path, opts);
    },
    patch: function (path, body, opts) {
      opts = opts || {};
      opts.method = 'PATCH';
      opts.body = body;
      return request(path, opts);
    },
    del: function (path, opts) {
      opts = opts || {};
      opts.method = 'DELETE';
      return request(path, opts);
    },

    /* --------------------------------------------------------
       AUTH
       -------------------------------------------------------- */
    register: function (payload) {
      return request('/api/auth/register', {
        method: 'POST',
        body: payload,
        skipAuth: true
      });
    },
    login: function (payload) {
      return request('/api/auth/login', {
        method: 'POST',
        body: payload,
        skipAuth: true
      });
    },
    me: function () {
      return authRequest('/api/auth/me', { method: 'GET' });
    },
    logout: function () {
      clearAuth();
      try {
        document.dispatchEvent(new CustomEvent('sangam:logout'));
      } catch (e) { /* ignore */ }
      return Promise.resolve({ ok: true, status: 200, data: { success: true } });
    },

    /* --------------------------------------------------------
       PUBLIC DATA
       -------------------------------------------------------- */
    getServices: function () {
      return request('/api/services', { method: 'GET' });
    },
    getPricing: function () {
      return request('/api/pricing', { method: 'GET' });
    },

    /* --------------------------------------------------------
       CONTACT + LEADS
       -------------------------------------------------------- */
    submitContact: function (payload) {
      return request('/api/contact', {
        method: 'POST',
        body: payload,
        skipAuth: true
      });
    },
    submitLead: function (payload) {
      return request('/api/leads', {
        method: 'POST',
        body: payload,
        skipAuth: true
      });
    },

    /* --------------------------------------------------------
       ORDERS (customer)
       -------------------------------------------------------- */
    createOrder: function (payload) {
      return request('/api/orders', {
        method: 'POST',
        body: payload,
        skipAuth: true   // orders don't strictly require login
      });
    },
    myOrders: function () {
      return authRequest('/api/orders', { method: 'GET' });
    },
    getOrder: function (orderId) {
      return authRequest('/api/orders/' + encodeURIComponent(orderId), {
        method: 'GET'
      });
    },

    /* --------------------------------------------------------
       APPOINTMENTS
       -------------------------------------------------------- */
    createAppointment: function (payload) {
      return request('/api/appointments', {
        method: 'POST',
        body: payload,
        skipAuth: true
      });
    },
    myAppointments: function () {
      return authRequest('/api/appointments', { method: 'GET' });
    },

    /* --------------------------------------------------------
       ADMIN
       -------------------------------------------------------- */
    adminOrders: function () {
      return authRequest('/api/admin/orders', { method: 'GET' });
    },
    adminOrder: function (orderId) {
      return authRequest('/api/admin/orders/' + encodeURIComponent(orderId), {
        method: 'GET'
      });
    },
    adminLeads: function () {
      return authRequest('/api/admin/leads', { method: 'GET' });
    },
    adminUpdateOrder: function (orderId, status) {
      return authRequest('/api/admin/orders/' + encodeURIComponent(orderId), {
        method: 'PATCH',
        body: { status: status }
      });
    },
    adminUpdateLead: function (leadId, payload) {
      return authRequest('/api/admin/leads/' + encodeURIComponent(leadId), {
        method: 'PATCH',
        body: payload
      });
    },
    adminMessages: function () {
      return authRequest('/api/admin/messages', { method: 'GET' });
    },
    adminAppointments: function () {
      return authRequest('/api/admin/appointments', { method: 'GET' });
    },
    adminAnalytics: function () {
      return authRequest('/api/admin/analytics', { method: 'GET' });
    },
    adminUpdateService: function (serviceId, payload) {
      return authRequest('/api/services/' + encodeURIComponent(serviceId), {
        method: 'PATCH',
        body: payload
      });
    },
    adminCreateService: function (payload) {
      return authRequest('/api/services', {
        method: 'POST',
        body: payload
      });
    },
    adminDeleteService: function (serviceId) {
      return authRequest('/api/services/' + encodeURIComponent(serviceId), {
        method: 'DELETE'
      });
    },

    /* --------------------------------------------------------
       N8N WEBHOOKS (outgoing automation triggers)
       -------------------------------------------------------- */
    notifyN8n: function (event, payload) {
      return request('/api/webhooks/n8n/' + encodeURIComponent(event), {
        method: 'POST',
        body: payload
      });
    },

    /* --------------------------------------------------------
       HEALTH CHECK
       -------------------------------------------------------- */
    ping: function () {
      return request('/api/services', { method: 'GET', timeout: 5000 });
    },
    health: function () {
      return request('/api/health', { method: 'GET', timeout: 5000, skipAuth: true });
    },

    /* --------------------------------------------------------
       GENERIC HELPERS
       -------------------------------------------------------- */
    /**
     * Safe wrapper that never throws. Returns { ok, status, data }.
     * Useful when you want to run a request inside an async chain
     * without worrying about unhandled rejections.
     */
    safe: function (promise) {
      return Promise.resolve(promise).catch(function (err) {
        return {
          ok: false,
          status: 0,
          data: { error: (err && err.message) || 'Unknown error' },
          networkError: true,
          error: err
        };
      });
    },

    /**
     * Build a URL with query params for the API base.
     * Example: api.buildUrl('/api/services', { category: 'ai' })
     */
    buildUrl: function (path, params) {
      var url = CONFIG.API_BASE + path;
      if (!params) return url;
      var qs = Object.keys(params)
        .filter(function (k) { return params[k] != null && params[k] !== ''; })
        .map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        })
        .join('&');
      return qs ? url + (url.indexOf('?') === -1 ? '?' : '&') + qs : url;
    }
  };

  /* ----------------------------------------------------------
     GLOBAL EXPORT
     ---------------------------------------------------------- */
  global.api = api;
  global.Sangam = global.Sangam || {};
  global.Sangam.api = api;

  /* ----------------------------------------------------------
     AUTO-REDIRECT ON 401 (optional, safe default)
     Redirects to login only if not already on login/register.
     ---------------------------------------------------------- */
  document.addEventListener('sangam:unauthorized', function () {
    var path = window.location.pathname;
    var currentFile = path.split('/').pop() || 'index.html';
    if (currentFile === 'login.html' || currentFile === 'register.html') return;
    // Uncomment the next line to force logout on 401
    // window.location.href = 'login.html';
  });

})(window);