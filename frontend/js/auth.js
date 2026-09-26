/* ============================================================
   SANGAM.AI — AUTHENTICATION (auth.js)
   Handles: login/register form wiring, field + form validation,
            password strength meter, password visibility toggles,
            submit → API, session storage, role-based redirects.
   Works with: login.html, register.html, api.js, main.js
   Exposes:   window.Auth = { wireForm, validateForm, ... }
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
     STORAGE HELPERS
     ---------------------------------------------------------- */
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; }
    catch (e) { return ''; }
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
    } catch (e) { return null; }
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
     DOM HELPERS
     ---------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function showToast(msg, type) {
    if (global.Sangam && typeof global.Sangam.showToast === 'function') {
      global.Sangam.showToast(msg, type);
    }
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
    $$('.form-error', form).forEach(function (el) { el.textContent = ''; });
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
    } else if (id === 'phone' && value && value.trim().length < 5) {
      ok = false;
      msg = 'Enter a valid phone number.';
    } else if (id === 'password' && value) {
      if (mode === 'register' && value.length < 8) {
        ok = false;
        msg = 'Password must be at least 8 characters.';
      }
    } else if ((id === 'confirm' || id === 'confirmPassword') && value) {
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

    var idsToCheck = ['name', 'email', 'password', 'confirmPassword', 'phone', 'terms'];
    var seen = {};
    var ok = true;

    $$('input', form).forEach(function (input) {
      if (!input.id || seen[input.id]) return;
      seen[input.id] = true;
      if (idsToCheck.indexOf(input.id) === -1) return;

      if (input.type === 'checkbox') {
        if (input.required && !input.checked) {
          setError(form, input.id, 'You must accept this to continue.');
          ok = false;
        }
        return;
      }

      if (!validateField(input, mode)) ok = false;
    });

    return ok;
  }

  /* ----------------------------------------------------------
     COLLECT PAYLOAD
     ---------------------------------------------------------- */
  function collectPayload(form, mode) {
    if (!form) return {};

    var emailEl   = form.querySelector('#email');
    var pwEl      = form.querySelector('#password');
    var nameEl    = form.querySelector('#name');
    var phoneEl   = form.querySelector('#phone');
    var rememberEl = form.querySelector('#remember');

    if (mode === 'login') {
      return {
        email:    emailEl ? emailEl.value.trim() : '',
        password: pwEl ? pwEl.value : '',
        remember: rememberEl ? rememberEl.checked : false
      };
    }

    return {
      name:     nameEl ? nameEl.value.trim() : '',
      email:    emailEl ? emailEl.value.trim() : '',
      phone:    phoneEl ? phoneEl.value.trim() : '',
      password: pwEl ? pwEl.value : ''
    };
  }

  /* ----------------------------------------------------------
     PASSWORD VISIBILITY TOGGLE (works with multiple buttons)
     ---------------------------------------------------------- */
  function wirePasswordToggles() {
    // Standard toggle (login.html uses id="togglePassword" with #password)
    var legacyToggle = document.getElementById('togglePassword');
    var legacyInput = document.getElementById('password');
    if (legacyToggle && legacyInput) {
      legacyToggle.addEventListener('click', function () {
        var isHidden = legacyInput.type === 'password';
        legacyInput.type = isHidden ? 'text' : 'password';
        legacyToggle.setAttribute('aria-pressed', String(isHidden));
        legacyToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');

        var icon = legacyToggle.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = isHidden ? 'visibility_off' : 'visibility';
      });
    }

    // Modern toggles (register.html uses data-toggle-password="<fieldId>")
    $$('[data-toggle-password]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fieldId = btn.getAttribute('data-toggle-password');
        var input = document.getElementById(fieldId);
        var icon = btn.querySelector('.material-symbols-outlined');
        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.textContent = 'visibility_off';
          btn.setAttribute('aria-label', 'Hide password');
        } else {
          input.type = 'password';
          if (icon) icon.textContent = 'visibility';
          btn.setAttribute('aria-label', 'Show password');
        }
      });
    });
  }

  /* ----------------------------------------------------------
     PASSWORD STRENGTH METER
     ---------------------------------------------------------- */
  function wirePasswordStrength() {
    var input = document.getElementById('password');
    if (!input) return;

    // Style 1: named elements (older pages)
    var meter = document.getElementById('pwStrength');
    var label = document.getElementById('pwStrengthLabel');

    // Style 2: modern (register.html)
    var fill = document.getElementById('pwStrengthFill');
    var label2 = document.getElementById('pwStrengthLabel');

    var labels = ['Password strength', 'Weak', 'Fair', 'Good', 'Strong'];

    input.addEventListener('input', function () {
      var score = scorePassword(input.value);

      if (meter) meter.setAttribute('data-level', String(score));
      if (fill)  fill.setAttribute('data-level', String(score));
      if (label) label.textContent = labels[score] || labels[0];
      if (label2 && !label) label2.textContent = labels[score] || labels[0];
    });
  }

  /* ----------------------------------------------------------
     CONFIRM PASSWORD MATCH BADGE
     ---------------------------------------------------------- */
  function wireMatchBadge() {
    var pw = document.getElementById('password');
    var confirm = document.getElementById('confirmPassword') || document.getElementById('confirm');
    var badge = document.getElementById('matchBadge');
    if (!pw || !confirm || !badge) return;

    function update() {
      if (confirm.value && pw.value === confirm.value) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
      }
    }

    pw.addEventListener('input', update);
    confirm.addEventListener('input', update);
  }

  /* ----------------------------------------------------------
     SESSION + REDIRECT
     ---------------------------------------------------------- */
  function storeSession(data) {
    if (!data) return;
    if (data.token) setToken(data.token);
    if (data.user) setUser(data.user);
  }

  function resolveNext(user) {
    var role = user && user.role;
    var next = role === 'ADMIN' ? 'admin.html' : 'dashboard.html';

    try {
      var params = new URLSearchParams(window.location.search);
      var requested = params.get('next');
      if (requested && /^[a-z0-9\-_]+\.html$/i.test(requested)) {
        next = requested;
      }
    } catch (e) { /* ignore */ }

    return next;
  }

  function redirect(next) {
    setTimeout(function () {
      window.location.href = next;
    }, 700);
  }

  /* ----------------------------------------------------------
     SUBMIT HANDLER
     ---------------------------------------------------------- */
  function handleSubmit(e, opts) {
    if (e) e.preventDefault();

    var form = e ? e.target : null;
    if (!form) return;

    var mode = opts.mode || 'login';
    var alertId = opts.alertId || 'authAlert';
    var submitBtnId = opts.submitBtnId || 'submitBtn';

    hideAlert(alertId);

    // Register needs terms checkbox checked
    if (mode === 'register') {
      var terms = form.querySelector('#terms');
      if (terms && !terms.checked) {
        setError(form, 'terms', 'You must accept the Terms and Privacy Policy.');
        showAlert(alertId, 'Please accept the Terms and Privacy Policy to continue.', 'error');
        showToast('Please accept the Terms to continue.', 'error');
        return;
      }
    }

    if (!validateForm(form, mode)) {
      showAlert(alertId, 'Please fix the highlighted fields and try again.', 'error');
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    var payload = collectPayload(form, mode);
    var btn = document.getElementById(submitBtnId);
    var labelEl, spinnerEl, arrowEl;

    if (btn) {
      labelEl   = btn.querySelector('.btn-label')   || btn.querySelector('#buttonLabel');
      spinnerEl = btn.querySelector('.btn-spinner') || btn.querySelector('#buttonSpinner');
      arrowEl   = btn.querySelector('.btn-arrow')   || btn.querySelector('#buttonIcon');
    }

    var originalLabel = labelEl ? labelEl.textContent : '';

    if (btn) btn.disabled = true;
    if (labelEl) labelEl.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';
    if (spinnerEl) spinnerEl.hidden = false;
    if (arrowEl) arrowEl.hidden = true;

    // Prefer window.api wrapper
    var request;
    var methodName = mode === 'login' ? 'login' : 'register';

    if (global.api && typeof global.api[methodName] === 'function') {
      request = global.api[methodName](payload);
    } else {
      var url = API_BASE + (mode === 'login' ? '/api/auth/login' : '/api/auth/register');
      request = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().then(
            function (data) { return { ok: r.ok, status: r.status, data: data }; },
            function ()     { return { ok: r.ok, status: r.status, data: null }; }
          );
        })
        .catch(function (err) {
          return { ok: false, status: 0, data: null, networkError: true, error: err };
        });
    }

    request
      .then(function (res) {
        if (!res.ok) {
          throw new Error((res.data && res.data.error) || 'Request failed.');
        }

        storeSession(res.data);

        // Build display name for toast
        var displayName =
          (res.data && res.data.user && res.data.user.name) ||
          (payload.name || (payload.email ? payload.email.split('@')[0] : 'there'));

        showToast(
          mode === 'login'
            ? 'Welcome back, ' + displayName + '!'
            : 'Account created. Welcome, ' + displayName + '!',
          'success'
        );

        showAlert(alertId, mode === 'login' ? 'Signed in successfully.' : 'Account created successfully.', 'success');

        var next = resolveNext(res.data && res.data.user);
        redirect(next);
      })
      .catch(function (err) {
        var msg = (err && err.message) || 'Something went wrong.';

        // Demo fallback if backend is unreachable
        var isNetwork = /Failed to fetch|NetworkError|Load failed/i.test(msg);
        if (isNetwork) {
          var demoUser = {
            name:  payload.name || (payload.email ? payload.email.split('@')[0] : 'Demo User'),
            email: payload.email || '',
            phone: payload.phone || '',
            role:  'CUSTOMER'
          };

          setToken('demo-token');
          setUser(demoUser);

          showToast('Demo mode: signed in.', 'success');
          showAlert(alertId, 'Demo mode: signed in successfully.', 'success');

          var next = resolveNext(demoUser);
          redirect(next);
          return;
        }

        showAlert(alertId, msg, 'error');
        showToast(msg, 'error');

        if (btn) btn.disabled = false;
        if (labelEl) labelEl.textContent = originalLabel || (mode === 'login' ? 'Sign in' : 'Create account');
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

    // Per-field blur validation + clear error on input
    $$('input', form).forEach(function (input) {
      if (!input.id) return;
      input.addEventListener('blur', function () { validateField(input, mode); });
      input.addEventListener('input', function () { setError(form, input.id, ''); });
      if (input.type === 'checkbox') {
        input.addEventListener('change', function () { setError(form, input.id, ''); });
      }
    });

    // Password UI helpers (auto-detect by IDs)
    wirePasswordToggles();
    if (mode === 'register') {
      wirePasswordStrength();
      wireMatchBadge();
    }

    // Submit
    form.addEventListener('submit', function (e) {
      handleSubmit(e, {
        mode: mode,
        formId: opts.formId,
        alertId: opts.alertId || 'authAlert',
        submitBtnId: opts.submitBtnId || 'submitBtn'
      });
    });
  }

  /* ----------------------------------------------------------
     AUTO-WIRE FOR KNOWN FORMS
     ---------------------------------------------------------- */
  function autoWire() {
    // login.html — form has id="loginForm"
    if (document.getElementById('loginForm')) {
      wireForm({
        formId: 'loginForm',
        mode: 'login',
        alertId: 'authAlert',
        submitBtnId: 'submitBtn'
      });
    }

    // register.html — form has id="registerForm"
    if (document.getElementById('registerForm')) {
      wireForm({
        formId: 'registerForm',
        mode: 'register',
        alertId: 'authAlert',
        submitBtnId: 'submitBtn'
      });
    }

    // Legacy IDs used on some pages
    if (document.getElementById('signupForm')) {
      wireForm({
        formId: 'signupForm',
        mode: 'register',
        alertId: 'authAlert',
        submitBtnId: 'submitBtn'
      });
    }
  }

  /* ----------------------------------------------------------
     SOCIAL AUTH — demo shortcut (Google / GitHub buttons)
     ---------------------------------------------------------- */
  function wireSocialButtons() {
    $$('[data-provider]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var provider = btn.getAttribute('data-provider');
        var demoUser = {
          name:  provider === 'google' ? 'Google User' : 'GitHub User',
          email: 'demo@' + provider + '.com',
          role:  'CUSTOMER'
        };
        setToken('demo-token');
        setUser(demoUser);
        showToast('Signed in with ' + provider + '.', 'success');
        var next = resolveNext(demoUser);
        redirect(next);
      });
    });
  }

  /* ----------------------------------------------------------
     REDIRECT IF ALREADY LOGGED IN
     (only on login/register pages — not on dashboard)
     ---------------------------------------------------------- */
  function redirectIfLoggedIn() {
    var hasLoginForm = document.getElementById('loginForm');
    var hasRegisterForm = document.getElementById('registerForm');
    if (!hasLoginForm && !hasRegisterForm) return;

    var token = getToken();
    var user  = getUser();
    if (token && user) {
      // Do not hijack if the user just cleared their session or is mid-flow
      var next = resolveNext(user);
      // Only redirect if the target page is different from current
      var currentFile = window.location.pathname.split('/').pop() || 'index.html';
      if (next !== currentFile) {
        window.location.replace(next);
      }
    }
  }

  /* ----------------------------------------------------------
     PUBLIC API
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
    clearAuth: clearAuth,
    redirectIfLoggedIn: redirectIfLoggedIn
  };

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    redirectIfLoggedIn();
    autoWire();
    wireSocialButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);