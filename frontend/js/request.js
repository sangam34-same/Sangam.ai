/* ============================================================
   SANGAM.AI — REQUEST WIZARD (request.js)
   Handles: 6-step wizard, validation, services picker,
            review screen, submission, success view.
   Works with: request.html, api.js, main.js
   Exposes:   window.SangamRequest = { state, goToStep, getFormData }
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  var API_BASE = (global.SANGAM_CONFIG && global.SANGAM_CONFIG.API_BASE) || '';
  var TOTAL_STEPS = 6;

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

  /* Fallback services if API fails */
  var FALLBACK_SERVICES = [
    { name: 'WhatsApp AI',       slug: 'whatsapp-ai',  icon: '💬' },
    { name: 'Instagram AI',      slug: 'instagram-ai', icon: '📷' },
    { name: 'Email AI',          slug: 'email-ai',     icon: '✉️' },
    { name: 'Voice AI',          slug: 'voice-ai',     icon: '📞' },
    { name: 'AI Chatbot',        slug: 'chatbot',      icon: '🤖' },
    { name: 'Lead Generation',   slug: 'lead-gen',     icon: '🎯' },
    { name: 'CRM Automation',    slug: 'crm',          icon: '🗂️' },
    { name: 'Appointment Booking', slug: 'booking',    icon: '📅' },
    { name: 'Custom AI Agent',   slug: 'custom',       icon: '⚡' }
  ];

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */
  var state = {
    currentStep: 1,
    services: [],
    submitting: false
  };

  /* ----------------------------------------------------------
     DOM HELPERS (safe, with optional chaining fallback)
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

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '') : '';
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
  }

  function isValidUrl(v) {
    return /^https?:\/\/.+\..+/.test(String(v || ''));
  }

  /* ----------------------------------------------------------
     ERROR / ALERT HANDLING
     ---------------------------------------------------------- */
  function setError(field, msg) {
    var el = document.querySelector('[data-error-for="' + field + '"]');
    if (el) el.textContent = msg || '';
  }

  function clearAllErrors() {
    $$('.form-error').forEach(function (el) { el.textContent = ''; });
  }

  function showAlert(msg, type) {
    var el = document.getElementById('formAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = 'auth-alert ' + (type || 'error');
    el.hidden = false;
  }

  function hideAlert() {
    var el = document.getElementById('formAlert');
    if (el) el.hidden = true;
  }

  function showToast(msg, type) {
    if (global.Sangam && typeof global.Sangam.showToast === 'function') {
      global.Sangam.showToast(msg, type);
    }
  }

  /* ----------------------------------------------------------
     STEPPER
     ---------------------------------------------------------- */
  function updateStepper() {
    var pct = ((state.currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    var fill = document.getElementById('stepperFill');
    if (fill) fill.style.width = pct + '%';

    $$('.step-dot').forEach(function (dot) {
      var n = parseInt(dot.getAttribute('data-step'), 10);
      dot.classList.toggle('active', n === state.currentStep);
      dot.classList.toggle('done', n < state.currentStep);
    });
  }

  function goToStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    state.currentStep = n;

    $$('.form-step').forEach(function (fs) {
      var stepNum = parseInt(fs.getAttribute('data-step'), 10);
      fs.classList.toggle('active', stepNum === n);
    });

    updateStepper();
    hideAlert();

    if (n === 6) renderReview();

    // Scroll into view (with a slight delay for the animation)
    var section = document.getElementById('requestSection');
    if (section) {
      setTimeout(function () {
        var y = section.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 50);
    }
  }

  /* ----------------------------------------------------------
     PER-STEP VALIDATION
     ---------------------------------------------------------- */
  function validateStep(n) {
    clearAllErrors();
    var ok = true;

    if (n === 1) {
      var fullName = val('fullName');
      var email = val('email');
      var phone = val('phone');
      var businessName = val('businessName');
      var industry = val('industry');
      var location = val('location');
      var website = val('website');

      if (fullName.trim().length < 2) {
        setError('fullName', 'Please enter your full name.');
        ok = false;
      }
      if (!isValidEmail(email)) {
        setError('email', 'Enter a valid email address.');
        ok = false;
      }
      if (phone.trim().length < 5) {
        setError('phone', 'Enter a valid phone number.');
        ok = false;
      }
      if (businessName.trim().length < 2) {
        setError('businessName', 'Business name is required.');
        ok = false;
      }
      if (!industry) {
        setError('industry', 'Please select an industry.');
        ok = false;
      }
      if (location.trim().length < 2) {
        setError('location', 'Location is required.');
        ok = false;
      }
      if (website && !isValidUrl(website)) {
        setError('website', 'Enter a valid URL (http:// or https://).');
        ok = false;
      }
    }

    if (n === 2) {
      var checked = $$('#servicesPicker input[type="checkbox"]:checked');
      if (checked.length === 0) {
        setError('services', 'Please select at least one AI employee.');
        ok = false;
      }
    }

    if (n === 3) {
      var req = val('requirements');
      if (req.trim().length < 10) {
        setError('requirements', 'Please describe your needs (at least 10 characters).');
        ok = false;
      }
    }

    if (n === 5) {
      var method = document.querySelector('input[name="contactMethod"]:checked');
      if (!method) {
        setError('contactMethod', 'Please choose a preferred contact method.');
        ok = false;
      }
    }

    return ok;
  }

  /* ----------------------------------------------------------
     SERVICES PICKER
     ---------------------------------------------------------- */
  function renderServices(list) {
    var wrap = document.getElementById('servicesPicker');
    if (!wrap) return;

    if (!Array.isArray(list) || !list.length) {
      list = FALLBACK_SERVICES;
    }

    var html = list.map(function (s) {
      var icon = resolveIcon(s.icon);
      var slug = s.slug || s.name;
      return (
        '<label class="service-tile">' +
          '<input type="checkbox" name="services" value="' + escapeHtml(slug) + '" />' +
          '<span class="service-tile-body">' +
            '<span class="service-tile-icon">' + icon + '</span>' +
            '<span class="service-tile-name">' + escapeHtml(s.name) + '</span>' +
            '<span class="service-tile-check" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
            '</span>' +
          '</span>' +
        '</label>'
      );
    }).join('');

    wrap.innerHTML = html;

    // Clear error whenever a checkbox is checked
    $$('#servicesPicker input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var any = $$('#servicesPicker input[type="checkbox"]:checked').length > 0;
        if (any) setError('services', '');
      });
    });
  }

  function loadServices() {
    var promise;

    // Prefer the api.js wrapper
    if (global.api && typeof global.api.getServices === 'function') {
      promise = global.api.getServices();
    } else {
      promise = fetch(API_BASE + '/api/services', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) {
          return r.json().then(
            function (data) { return { ok: r.ok, status: r.status, data: data }; },
            function () { return { ok: r.ok, status: r.status, data: null }; }
          );
        })
        .catch(function () {
          return { ok: false, status: 0, data: null };
        });
    }

    promise
      .then(function (res) {
        if (res && res.ok && Array.isArray(res.data) && res.data.length) {
          state.services = res.data;
        } else {
          state.services = FALLBACK_SERVICES;
        }
        renderServices(state.services);
        // Re-apply URL param selections now that services exist
        applyServiceFromUrl();
      })
      .catch(function () {
        state.services = FALLBACK_SERVICES;
        renderServices(state.services);
        applyServiceFromUrl();
      });
  }

  /* ----------------------------------------------------------
     COLLECT FORM DATA
     ---------------------------------------------------------- */
  function getFormData() {
    var servicesChecked = $$('#servicesPicker input[type="checkbox"]:checked')
      .map(function (cb) { return cb.value; });

    var channelsChecked = $$('#channelsGroup input[type="checkbox"]:checked')
      .map(function (cb) { return cb.value; });

    var methodEl = document.querySelector('input[name="contactMethod"]:checked');

    return {
      fullName: val('fullName'),
      email: val('email'),
      phone: val('phone'),
      businessName: val('businessName'),
      industry: val('industry'),
      location: val('location'),
      website: val('website'),
      services: servicesChecked,
      requirements: val('requirements'),
      employees: val('employees'),
      messagesPerDay: val('messagesPerDay'),
      callsPerDay: val('callsPerDay'),
      currentCrm: val('currentCrm'),
      channels: channelsChecked,
      contactMethod: methodEl ? methodEl.value : ''
    };
  }

  /* ----------------------------------------------------------
     REVIEW RENDER
     ---------------------------------------------------------- */
  function renderReview() {
    var d = getFormData();
    var card = document.getElementById('reviewCard');
    if (!card) return;

    var methodLabels = {
      WHATSAPP: 'WhatsApp',
      EMAIL: 'Email',
      PHONE: 'Phone call',
      VIDEO_CALL: 'Video call'
    };

    function row(label, value) {
      return (
        '<div class="review-row">' +
          '<span class="review-label">' + escapeHtml(label) + '</span>' +
          '<span class="review-value">' + (value ? escapeHtml(value) : '—') + '</span>' +
        '</div>'
      );
    }

    function listRow(label, arr) {
      var v = arr && arr.length ? arr.join(', ') : '—';
      return row(label, v);
    }

    card.innerHTML =
      '<div class="review-block">' +
        '<h3>Business</h3>' +
        row('Name', d.fullName) +
        row('Email', d.email) +
        row('Phone', d.phone) +
        row('Business', d.businessName) +
        row('Industry', d.industry) +
        row('Location', d.location) +
        row('Website', d.website) +
      '</div>' +
      '<div class="review-block">' +
        '<h3>AI Employees</h3>' +
        listRow('Selected', d.services) +
      '</div>' +
      '<div class="review-block">' +
        '<h3>Requirements</h3>' +
        '<p class="review-text">' + (d.requirements ? escapeHtml(d.requirements) : '—') + '</p>' +
      '</div>' +
      '<div class="review-block">' +
        '<h3>Scale</h3>' +
        row('Employees', d.employees) +
        row('Messages / day', d.messagesPerDay) +
        row('Calls / day', d.callsPerDay) +
        row('Current CRM', d.currentCrm) +
        listRow('Channels', d.channels) +
      '</div>' +
      '<div class="review-block">' +
        '<h3>Contact</h3>' +
        row('Preferred method', methodLabels[d.contactMethod] || d.contactMethod) +
      '</div>';
  }

  /* ----------------------------------------------------------
     SUBMISSION
     ---------------------------------------------------------- */
  function submitForm(e) {
    if (e) e.preventDefault();
    if (state.submitting) return;

    // Re-validate all critical steps
    for (var i = 1; i <= 5; i++) {
      if (!validateStep(i)) {
        goToStep(i);
        showAlert('Please fix the highlighted fields.', 'error');
        showToast('Please fix the highlighted fields.', 'error');
        return;
      }
    }

    var payload = getFormData();
    var btn = document.getElementById('submitBtn');
    var label = btn ? btn.querySelector('.btn-label') : null;
    var spinner = btn ? btn.querySelector('.btn-spinner') : null;
    var arrow = btn ? btn.querySelector('.btn-arrow') : null;

    state.submitting = true;
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Submitting…';
    if (spinner) spinner.hidden = false;
    if (arrow) arrow.hidden = true;

    hideAlert();

    var promise;

    if (global.api && typeof global.api.createOrder === 'function') {
      promise = global.api.createOrder(payload);
    } else {
      promise = fetch(API_BASE + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().then(
            function (data) { return { ok: r.ok, status: r.status, data: data }; },
            function () { return { ok: r.ok, status: r.status, data: null }; }
          );
        })
        .catch(function (err) {
          return { ok: false, status: 0, data: null, networkError: true, error: err };
        });
    }

    promise
      .then(function (res) {
        if (!res.ok) {
          throw new Error((res.data && res.data.error) || 'Submission failed.');
        }

        var orderNum =
          (res.data && (res.data.order_number || res.data.orderNumber)) ||
          'SGM-' + Math.floor(10000 + Math.random() * 90000);

        showSuccess(orderNum);
        showToast('Request submitted successfully!', 'success');
      })
      .catch(function (err) {
        var msg = (err && err.message) || 'Something went wrong. Please try again.';
        var isNetwork = /Failed to fetch|NetworkError|Load failed/i.test(msg);

        // Demo mode fallback when the backend isn't running
        if (isNetwork) {
          var demoNum = 'SGM-' + Math.floor(10000 + Math.random() * 90000);
          showSuccess(demoNum);
          showToast('Demo mode: request submitted.', 'success');
          return;
        }

        showAlert(msg, 'error');
        showToast(msg, 'error');

        state.submitting = false;
        if (btn) btn.disabled = false;
        if (label) label.textContent = 'Submit request';
        if (spinner) spinner.hidden = true;
        if (arrow) arrow.hidden = false;
      });
  }

  function showSuccess(orderNumber) {
    var form = document.getElementById('requestForm');
    var stepper = document.getElementById('stepper');
    var section = document.getElementById('requestSection');
    var success = document.getElementById('successView');
    var orderEl = document.getElementById('orderNumber');

    if (form) form.hidden = true;
    if (stepper) stepper.hidden = true;
    if (section) section.hidden = true;
    if (orderEl) orderEl.textContent = orderNumber;
    if (success) {
      success.hidden = false;
      setTimeout(function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  }

  /* ----------------------------------------------------------
     NAVIGATION WIRING
     ---------------------------------------------------------- */
  function wireNav() {
    $$('[data-next]').forEach(function (b) {
      b.addEventListener('click', function () {
        var next = parseInt(b.getAttribute('data-next'), 10);
        var stepEl = b.closest('.form-step');
        var current = stepEl ? parseInt(stepEl.getAttribute('data-step'), 10) : state.currentStep;
        if (validateStep(current)) goToStep(next);
      });
    });

    $$('[data-prev]').forEach(function (b) {
      b.addEventListener('click', function () {
        var prev = parseInt(b.getAttribute('data-prev'), 10);
        goToStep(prev);
      });
    });
  }

  /* ----------------------------------------------------------
     CONTACT METHOD — clear error on change
     ---------------------------------------------------------- */
  function wireContactMethods() {
    $$('input[name="contactMethod"]').forEach(function (r) {
      r.addEventListener('change', function () {
        setError('contactMethod', '');
      });
    });
  }

  /* ----------------------------------------------------------
     CHARACTER COUNTER FOR REQUIREMENTS
     ---------------------------------------------------------- */
  function wireCharCounter() {
    var ta = document.getElementById('requirements');
    var counter = document.getElementById('reqCount');
    if (!ta || !counter) return;

    ta.addEventListener('input', function () {
      counter.textContent = String(ta.value.length);
    });
    // Initialize on load
    counter.textContent = String(ta.value.length);
  }

  /* ----------------------------------------------------------
     URL PARAM PREFILL
     ---------------------------------------------------------- */
  function applyServiceFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var service = params.get('service');
      if (!service) return;

      // The service URL param may be a slug like "whatsapp-ai"
      // or a name like "WhatsApp AI Agent".
      var cb = document.querySelector('#servicesPicker input[value="' + service + '"]');
      if (cb) {
        cb.checked = true;
        return;
      }

      // Fallback: match by slugified name
      var found = false;
      $$('#servicesPicker input[type="checkbox"]').forEach(function (input) {
        if (found) return;
        var value = input.value;
        if (value.toLowerCase() === service.toLowerCase()) {
          input.checked = true;
          found = true;
        }
      });
    } catch (e) { /* silent */ }
  }

  function applyUrlParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var plan = params.get('plan');
      var service = params.get('service');

      if (plan) {
        var alertBox = document.getElementById('formAlert');
        if (alertBox) {
          alertBox.className = 'auth-alert info';
          alertBox.textContent = 'You selected the "' + plan + '" plan. Fill in your details and we\'ll tailor the setup.';
          alertBox.hidden = false;
        }
      }

      // If services are already loaded, apply immediately
      if (service && state.services.length) {
        applyServiceFromUrl();
      }
      // Otherwise applyServiceFromUrl() is called after services load
    } catch (e) { /* silent */ }
  }

  /* ----------------------------------------------------------
     RESET WIZARD (for "Start over" scenarios)
     ---------------------------------------------------------- */
  function resetWizard() {
    var form = document.getElementById('requestForm');
    if (form) form.reset();

    // Uncheck all services
    $$('#servicesPicker input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    $$('#channelsGroup input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });

    // Reset contact method radios
    $$('input[name="contactMethod"]').forEach(function (r) { r.checked = false; });

    // Reset char counter
    var counter = document.getElementById('reqCount');
    if (counter) counter.textContent = '0';

    // Clear errors
    clearAllErrors();
    hideAlert();

    // Back to step 1
    state.currentStep = 1;
    state.submitting = false;

    // Show form, hide success
    var form2 = document.getElementById('requestForm');
    var stepper = document.getElementById('stepper');
    var section = document.getElementById('requestSection');
    var success = document.getElementById('successView');
    if (form2) form2.hidden = false;
    if (stepper) stepper.hidden = false;
    if (section) section.hidden = false;
    if (success) success.hidden = true;

    goToStep(1);
  }

  /* ----------------------------------------------------------
     KEYBOARD SHORTCUTS
     ---------------------------------------------------------- */
  function wireKeyboard() {
    document.addEventListener('keydown', function (e) {
      // Enter on a text field within a step advances to the next step
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
        var stepEl = e.target.closest('.form-step');
        if (!stepEl) return;
        var stepNum = parseInt(stepEl.getAttribute('data-step'), 10);
        // Don't hijack Enter inside textarea or on step 6
        if (e.target.tagName === 'TEXTAREA') return;
        if (stepNum >= 1 && stepNum < 6) {
          e.preventDefault();
          var nextBtn = stepEl.querySelector('[data-next]');
          if (nextBtn) nextBtn.click();
        }
      }
    });
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  global.SangamRequest = {
    state: state,
    goToStep: goToStep,
    getFormData: getFormData,
    resetWizard: resetWizard,
    loadServices: loadServices,
    renderServices: renderServices
  };

  /* ----------------------------------------------------------
     BOOT
     ---------------------------------------------------------- */
  function init() {
    // Only run if the request wizard is on the page
    if (!document.getElementById('requestForm')) return;

    // Init year (in case main.js isn't loaded)
    var yearEl = document.getElementById('year');
    if (yearEl && !yearEl.textContent) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    loadServices();
    wireNav();
    wireContactMethods();
    wireCharCounter();
    wireKeyboard();
    updateStepper();

    var form = document.getElementById('requestForm');
    if (form) form.addEventListener('submit', submitForm);

    applyUrlParams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ----------------------------------------------------------
     LATE FAILSAFE — re-apply URL params if services were slow
     ---------------------------------------------------------- */
  setTimeout(function () {
    if (!document.getElementById('requestForm')) return;
    applyServiceFromUrl();
  }, 2500);

})(window);