/* ============================================================
   SANGAM.AI — AUTHENTICATION (auth.js)
   Handles: login/register form wiring, validation, password
            strength, submit → API, session storage, redirects
   Exposes: window.Auth
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '';
  var TOKEN_KEY = 'sangam_token';
  var USER_KEY = 'sangam_user';

  /* ----------------------------------------------------------
     STORAGE HELPERS
     ---------------------------------------------------------- */
  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  function getUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ----------------------------------------------------------
     VALIDATION HELPERS
     ---------------------------------------------------------- */
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
  }

  function scorePassword(pw) {
    if (!pw) return 0;
    var score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }

  /* ----------------------------------------------------------
     FIELD ERROR DISPLAY
     ---------------------------------------------------------- */
  function setError(form, fieldId, msg) {
    if (!form) return;
    var el = form.querySelector('[data-error-for="' + fieldId + '"]');
    if (el) el.textContent = msg || '';
  }

  function clearAllErrors(form) {
    if (!form) return;
    Array.prototype.slice
      .call(form.querySelectorAll('.form-error'))
      .forEach(function (el) {
        el.textContent = '';
      });
  }

  function showAlert(alertId, msg, type) {
    var el = document.getElementById(alertId);
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-alert ' + (type || 'error');
    el.hidden = false;
  }

  function hideAlert(alertId) {
    var el = document.getElementById(alertId);
    if (el) el.hidden = true;
  }

  /* ----------------------------------------------------------
     SINGLE-FIELD VALIDATION
     ---------------------------------------------------------- */
  function validateField(input, mode) {
    if (!input || !input.form) return true;

    var id = input.id;
    var value = String(input.value || '');
    var form = input.form;
    var ok = true;
    var msg = '';

    if (input.required && !value.trim()) {
      ok = false;
      msg = 'This field is required.';
    } else if (id === 'email' && value && !isValidEmail(value)) {
      ok = false;
      msg = 'Enter a valid email address.';
    } else if (id === 'name' && value && value.trim().length < 2) {
      ok = false;
      msg = 'Name must be at least 2 characters.';
    } else if (id === 'password' && value) {
      if (mode === 'register' && value.length < 8) {
        ok = false;
        msg = 'Password must be at least 8 characters.';
      }
    } else if (id === 'confirm' && value) {
      var pw = form.querySelector('#password');
      if (pw && value !== pw.value) {
        ok = false;
        msg = 'Passwords do not match.';
      }
    }

    setError(form, id, ok ? '' : msg);
    return ok;
  }

  /* ----------------------------------------------------------
     FULL-FORM VALIDATION
     ---------------------------------------------------------- */
  function validateForm(form, mode) {
    if (!form) return false;
    clearAllErrors(form);

    var inputs = form.querySelectorAll('input');
    var ok = true;
    var seen = {};

    Array.prototype.slice.call(inputs).forEach(function (input) {
      if (!input.id || seen[input.id]) return;
      seen[input.id] = true;

      // Only validate the fields we care about
      var idsToCheck = ['name', 'email', 'password', 'confirm', 'phone'];
      if (idsToCheck.indexOf(input.id) === -1) return;

      if (!validateField(input, mode)) ok = false;
    });

    return ok;
  }

  /* ----------------------------------------------------------
     COLLECT PAYLOAD
     ---------------------------------------------------------- */
  function collectPayload(form, mode) {
    if (!form) return {};

    var emailEl = form.querySelector('#email');
    var pwEl = form.querySelector('#password');
    var nameEl = form.querySelector('#name');
    var phoneEl = form.querySelector('#phone');
    var rememberEl = form.querySelector('#remember');

    if (mode === 'login') {
      return {
        email: emailEl ? emailEl.value.trim() : '',
        password: pwEl ? pwEl.value : '',
        remember: rememberEl ? rememberEl.checked : false
      };
    }

    return {
      name: nameEl ? nameEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : '',
      phone: phoneEl ? phoneEl.value.trim() : '',
      password: pwEl ? pwEl.value : ''
    };
  }

  /* ----------------------------------------------------------
     PASSWORD VISIBILITY TOGGLE
     ---------------------------------------------------------- */
  function wirePasswordToggle() {
    var toggle = document.getElementById('togglePassword');
    var input = document.getElementById('password');
    if (!toggle || !input) return;

    toggle.addEventListener('click', function () {
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';

      toggle.setAttribute('aria-pressed', String(isHidden));
      toggle.setAttribute(
        'aria-label',
        isHidden ? 'Hide password' : 'Show password'
      );

      var eyeOpen = toggle.querySelector('.eye-open');
      var eyeClosed = toggle.querySelector('.eye-closed');
      if (eyeOpen) eyeOpen.hidden = isHidden;
      if (eyeClosed) eyeClosed.hidden = !isHidden;
    });
  }

  /* ----------------------------------------------------------
     PASSWORD STRENGTH METER
     ---------------------------------------------------------- */
  function wirePasswordStrength() {
    var input = document.getElementById('password');
    var meter = document.getElementById('pwStrength');
    var label = document.getElementById('pwStrengthLabel');
    if (!input || !meter) return;

    var labels = ['Password strength', 'Weak', 'Fair', 'Good', 'Strong'];

    input.addEventListener('input', function () {
      var score = scorePassword(input.value);
      meter.setAttribute('data-level', String(score));
      if (label) label.textContent = labels[score] || labels[0];
    });
  }

  /* ----------------------------------------------------------
     SUBMIT HANDLER
     ---------------------------------------------------------- */
  function handleSubmit(e, opts) {
    e.preventDefault();

    var form = e.target;
    var mode = opts.mode;
    var alertId = opts.alertId || 'authAlert';
    var submitBtnId = opts.submitBtnId || 'submitBtn';

    hideAlert(alertId);

    // Special-case register: require terms checkbox
    if (mode === 'register') {
      var terms = form.querySelector('#terms');
      if (terms && !terms.checked) {
        showAlert(
          alertId,
          'Please accept the Terms and Privacy Policy to continue.',
          'error'
        );
        return;
      }
    }

    if (!validateForm(form, mode)) {
      showAlert(
        alertId,
        'Please fix the highlighted fields and try again.',
        'error'
      );
      return;
    }

    var payload = collectPayload(form, mode);
    var btn = document.getElementById(submitBtnId);
    var labelEl = btn ? btn.querySelector('.btn-label') : null;
    var spinnerEl = btn ? btn.querySelector('.btn-spinner') : null;
    var arrowEl = btn ? btn.querySelector('.btn-arrow') : null;

    var originalLabel = labelEl ? labelEl.textContent : '';

    if (btn) btn.disabled = true;
    if (labelEl) {
      labelEl.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';
    }
    if (spinnerEl) spinnerEl.hidden = false;
    if (arrowEl) arrowEl.hidden = true;

    // Prefer window.api if available
    var request;
    if (global.api && typeof global.api[mode === 'login' ? 'login' : 'register'] === 'function') {
      request = mode === 'login'
        ? global.api.login(payload)
        : global.api.register(payload);
    } else {
      // Fallback to fetch
      var url = API_BASE + (mode === 'login' ? '/api/auth/login' : '/api/auth/register');
      request = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().then(
          function (data) { return { ok: r.ok, status: r.status, data: data }; },
          function () { return { ok: r.ok, status: r.status, data: null }; }
        );
      });
    }

    request
      .then(function (res) {
        if (!res.ok) {
          throw new Error((res.data && res.data.error) || 'Request failed.');
        }

        // Store session
        if (res.data && res.data.token) {
          setToken(res.data.token);
        }
        if (res.data && res.data.user) {
          setUser(res.data.user);
        }

        // Redirect by role
        var role = res.data && res.data.user && res.data.user.role;
        var next = role === 'ADMIN' ? 'admin.html' : 'dashboard.html';

        // Honor ?next= param if present and safe
        try {
          var params = new URLSearchParams(window.location.search);
          var requested = params.get('next');
          if (requested && /^[a-z0-9\-_]+\.html$/i.test(requested)) {
            next = requested;
          }
        } catch (e) { /* ignore */ }

        window.location.href = next;
      })
      .catch(function (err) {
        var msg = (err && err.message) || 'Something went wrong.';

        // Demo fallback if no backend is running
        var isNetwork = /Failed to fetch|NetworkError|Load failed/i.test(msg);
        if (isNetwork) {
          // Store a demo session so pages guarded by auth still work
          setToken('demo-token');
          setUser({
            name: payload.email ? payload.email.split('@')[0] : 'Demo User',
            email: payload.email || '',
            role: 'CUSTOMER'
          });
          showAlert(alertId, 'Demo mode: signed in.', 'success');
          setTimeout(function () {
            window.location.href = 'dashboard.html';
          }, 700);
          return;
        }

        showAlert(alertId, msg, 'error');

        if (btn) btn.disabled = false;
        if (labelEl) labelEl.textContent = originalLabel;
        if (spinnerEl) spinnerEl.hidden = true;
        if (arrowEl) arrowEl.hidden = false;
      });
  }

  /* ----------------------------------------------------------
     WIRE A FORM
     ---------------------------------------------------------- */
  function wireForm(opts) {
    if (!opts || !opts.formId) return;

    var form = document.getElementById(opts.formId);
    if (!form) return;

    var mode = opts.mode || 'login';

    // Per-field validation on blur + clear error on input
    Array.prototype.slice.call(form.querySelectorAll('input')).forEach(function (input) {
      input.addEventListener('blur', function () {
        validateField(input, mode);
      });
      input.addEventListener('input', function () {
        setError(form, input.id, '');
      });
    });

    // Password toggle + strength (auto-detect by IDs)
    wirePasswordToggle();
    if (mode === 'register') {
      wirePasswordStrength();
    }

    // Submit
    form.addEventListener('submit', function (e) {
      handleSubmit(e, opts);
    });
  }

  /* ----------------------------------------------------------
     PUBLIC EXPORT
     ---------------------------------------------------------- */
  global.Auth = {
    wireForm: wireForm,
    validateField: validateField,
    validateForm: validateForm,
    scorePassword: scorePassword,
    isValidEmail: isValidEmail,
    getToken: getToken,
    setToken: setToken,
    getUser: getUser,
    setUser: setUser,
    clearAuth: clearAuth
  };
})(window);