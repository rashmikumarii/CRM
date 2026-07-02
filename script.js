/* =============================================================================
   OrthoNow — Landing page behaviour
   -----------------------------------------------------------------------------
   Vanilla JS, no dependencies, deferred load. Responsibilities:
     1. Validate and submit the 2-field consultation form without a page reload.
     2. Show the inline Thank-You state on success.
     3. Push analytics events to the GTM dataLayer that match the Task 1 schema.

   Design choices:
     - We keep a single tiny helper (`dlPush`) so every push is consistent and
       guarded (dataLayer may not exist if GTM is blocked).
     - Interaction tracking (call / whatsapp / cta clicks) is delegated from
       document, so it works for elements added later and costs one listener.
     - This static build has no backend, so the form "succeeds" locally after a
       simulated async call. In production, replace `submitLead()` with the real
       POST to /api/lead (see task-3/integration-design.md).
   ========================================================================== */

(function () {
  'use strict';

  /* ---- Small helpers ----------------------------------------------------- */

  // Guarded dataLayer push — never throws if GTM is blocked/unloaded.
  function dlPush(payload) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    // In this static build we mirror to the console so events are visible
    // without a live GTM container. Safe to leave; it's a no-op cost.
    if (window.console && console.debug) {
      console.debug('[dataLayer]', payload);
    }
  }

  // ISO-8601 timestamp for event payloads (schema requires `timestamp`).
  function nowIso() {
    return new Date().toISOString();
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

  /* ---- 1. Consultation form ---------------------------------------------- */

  var form = qs('#consultation');
  var thankYou = qs('#thank-you');

  // Field-level validators. Kept declarative so rules are easy to read/extend.
  var validators = {
    name: function (value) {
      if (!value.trim()) return 'Please enter your name.';
      if (value.trim().length < 2) return 'Name looks too short.';
      return '';
    },
    phone: function (value) {
      var digits = value.replace(/\D/g, '');
      // Indian mobile numbers: 10 digits, first digit 6–9.
      if (!digits) return 'Please enter your mobile number.';
      if (!/^[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit mobile number.';
      return '';
    }
  };

  // Render a validation message and toggle the invalid state for a field.
  function setFieldError(fieldName, message) {
    var input = qs('#' + fieldName, form);
    var errorEl = qs('[data-error-for="' + fieldName + '"]', form);
    if (errorEl) errorEl.textContent = message;
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }

  // Validate all fields; returns true if the whole form is valid.
  function validateForm() {
    var valid = true;
    Object.keys(validators).forEach(function (name) {
      var input = qs('#' + name, form);
      var message = validators[name](input ? input.value : '');
      if (!setFieldError(name, message)) valid = false;
    });
    return valid;
  }

  // Simulated async submission. Replace with the real backend call in prod:
  //   return fetch('/api/lead', { method:'POST', body: JSON.stringify(data) })
  //            .then(function (r) { if (!r.ok) throw new Error(r.status); });
  function submitLead(/* data */) {
    return new Promise(function (resolve) {
      setTimeout(resolve, 400); // mimic network latency
    });
  }

  if (form) {
    // Clear a field's error as the user corrects it (better UX than only-on-submit).
    ['name', 'phone'].forEach(function (name) {
      var input = qs('#' + name, form);
      if (input) {
        input.addEventListener('input', function () {
          if (input.getAttribute('aria-invalid') === 'true') {
            setFieldError(name, validators[name](input.value));
          }
        });
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault(); // 1. Prevent reload

      if (!validateForm()) {
        // Move focus to the first invalid field for accessibility.
        var firstInvalid = qs('[aria-invalid="true"]', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var submitBtn = qs('button[type="submit"]', form);
      var clinic = qs('#clinic', form) ? qs('#clinic', form).value : 'Unknown';

      // Prevent double submits while the request is in flight.
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      submitLead().then(function () {
        // 2. Fire the analytics event (Task 1 schema: consultation_form_submitted)
        dlPush({
          event: 'consultation_form_submitted',
          form_name: 'hero_consultation',
          clinic: clinic,
          page_location: window.location.href,
          timestamp: nowIso()
        });

        // 3. Reveal the Thank-You state, hide the form.
        form.hidden = true;
        if (thankYou) {
          thankYou.hidden = false;
          thankYou.focus && thankYou.focus();
          // Bring the confirmation into view on mobile.
          thankYou.scrollIntoView({ block: 'center' });
        }
      }).catch(function () {
        // Graceful failure: let the user retry, surface a message.
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Request callback';
        }
        setFieldError('phone', 'Something went wrong. Please try again.');
      });
    });
  }

  /* ---- 2. Delegated interaction tracking --------------------------------- */
  /* One listener on document handles every tracked click. `closest()` finds
     the nearest matching ancestor, so clicks on inner <svg>/<span> still work. */

  document.addEventListener('click', function (event) {
    var target = event.target;

    // Call buttons / tel: links  → call_button_click + phone_click
    var call = target.closest && target.closest('.js-call');
    if (call) {
      dlPush({
        event: 'call_button_click',
        clinic: call.getAttribute('data-clinic') || 'OrthoNow Network',
        phone_region: call.getAttribute('data-phone-region') || 'IN',
        link_text: (call.textContent || '').trim(),
        page_location: window.location.href
      });
      dlPush({
        event: 'phone_click',
        phone_region: call.getAttribute('data-phone-region') || 'IN',
        link_url: call.getAttribute('href') || '',
        page_location: window.location.href
      });
      return;
    }

    // WhatsApp CTAs → whatsapp_click
    var wa = target.closest && target.closest('.js-whatsapp');
    if (wa) {
      dlPush({
        event: 'whatsapp_click',
        clinic: wa.getAttribute('data-clinic') || 'OrthoNow Network',
        link_url: wa.getAttribute('href') || '',
        page_location: window.location.href
      });
      return;
    }

    // Generic primary CTAs → cta_click
    var cta = target.closest && target.closest('.js-cta');
    if (cta) {
      dlPush({
        event: 'cta_click',
        cta_id: cta.getAttribute('data-cta-id') || 'unknown',
        cta_text: (cta.textContent || '').trim(),
        page_location: window.location.href
      });
    }
  });

})();
