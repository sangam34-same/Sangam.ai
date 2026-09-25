/* ============================================================
   SANGAM.AI — API CLIENT (api.js)
   Central fetch wrapper + auth token storage + endpoint helpers
   Exposes: window.api
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var CONFIG = {
    API_BASE: (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '',
    APP_NAME: (global.SANGAM_CONFIG && global.SANGAM_CONFIG.APP_NAME) || 'Sangam.ai',
    TOKEN_KEY: 'sangam_token',
    USER_KEY: 'sangam_user',
    DEFAULT_TIMEOUT_MS: 20000
  };

  /* ----------------------------------------------------------
     STORAGE HELPERS
     ---------------------------------------------------------- */
  function getToken() {
    try {
      return localStorage.getItem(CONFIG.TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setToken(token) {
    try {
      if (token) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
      } else {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
      }
    } catch (e) { /* ignore */ }
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    try {
      if (user) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CONFIG.USER_KEY);
      }
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
     Every response is returned as: { ok, status, data }
     ---------------------------------------------------------- */
  function normalizeResponse(response) {
    return response.text().then(function (text) {
      var data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
      }
      return {
        ok: response.ok,
        status: response.status,
        data: data
      };
    });
  }

  /* ----------------------------------------------------------
     REQUEST CORE
     ---------------------------------------------------------- */
  function request(path, options) {
    options = options || {};

    var url = CONFIG.API_BASE + path;
    var method = (options.method || 'GET').toUpperCase();

    var headers = Object.assign({}, options.headers || {});
    headers['Accept'] = 'application/json';

    // Attach auth token if present
    var token = getToken();
    if (token && !options.skipAuth) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    // Serialize body if plain object
    var body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    var controller = null;
    var timeoutId = null;
    var fetchOptions = {
      method: method,
      headers: headers,
      body: body,
      credentials: options.credentials || 'omit'
    };

    // Optional timeout
    if (typeof AbortController !== 'undefined' && options.timeout !== 0) {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(function () {
        try { controller.abort(); } catch (e) { /* ignore */ }
      }, options.timeout || CONFIG.DEFAULT_TIMEOUT_MS);
    }

    return fetch(url, fetchOptions)
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        return normalizeResponse(res);
      })
      .catch(function (err) {
        if (timeoutId) clearTimeout(timeoutId);

        // Distinguish network vs abort
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
          networkError: true
        };
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
      return request('/api/auth/register', { method: 'POST', body: payload });
    },
    login: function (payload) {
      return request('/api/auth/login', { method: 'POST', body: payload });
    },
    me: function () {
      return request('/api/auth/me', { method: 'GET' });
    },
    logout: function () {
      clearAuth();
      return { ok: true };
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
      return request('/api/contact', { method: 'POST', body: payload });
    },
    submitLead: function (payload) {
      return request('/api/leads', { method: 'POST', body: payload });
    },

    /* --------------------------------------------------------
       ORDERS (customer)
       -------------------------------------------------------- */
    createOrder: function (payload) {
      return request('/api/orders', { method: 'POST', body: payload });
    },
    myOrders: function () {
      return request('/api/orders', { method: 'GET' });
    },

    /* --------------------------------------------------------
       APPOINTMENTS
       -------------------------------------------------------- */
    createAppointment: function (payload) {
      return request('/api/appointments', { method: 'POST', body: payload });
    },

    /* --------------------------------------------------------
       ADMIN
       -------------------------------------------------------- */
    adminOrders: function () {
      return request('/api/admin/orders', { method: 'GET' });
    },
    adminLeads: function () {
      return request('/api/admin/leads', { method: 'GET' });
    },
    adminUpdateOrder: function (orderId, status) {
      return request('/api/admin/orders/' + encodeURIComponent(orderId), {
        method: 'PATCH',
        body: { status: status }
      });
    },
    adminAnalytics: function () {
      return request('/api/admin/analytics', { method: 'GET' });
    },
    adminUpdateService: function (serviceId, payload) {
      return request('/api/services/' + encodeURIComponent(serviceId), {
        method: 'PATCH',
        body: payload
      });
    },
    adminCreateService: function (payload) {
      return request('/api/services', { method: 'POST', body: payload });
    },
    adminDeleteService: function (serviceId) {
      return request('/api/services/' + encodeURIComponent(serviceId), {
        method: 'DELETE'
      });
    },

    /* --------------------------------------------------------
       N8N WEBHOOKS (outgoing)
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
    }
  };

  /* ----------------------------------------------------------
     GLOBAL EXPORT
     ---------------------------------------------------------- */
  global.api = api;

  /* ----------------------------------------------------------
     ALSO EXPOSE `window.Sangam` FOR LEGACY REFS
     ---------------------------------------------------------- */
  global.Sangam = global.Sangam || {};
  global.Sangam.api = api;
})(window);