/* ==========================================================================
 * forms.js — Formulario de contacto de DecoPared
 *
 * Qué hace al pulsar "Enviar":
 *   1. Evita que la página se recargue.
 *   2. Envía los datos a Web3Forms (llega el correo, como hasta ahora).
 *   3. Envía los datos a HubSpot (crea el contacto) — solo si está configurado.
 *   4. Avisa a Google Tag Manager con el evento "form_submit" (o "form_error")
 *      a través del dataLayer, para que GA4 registre la conversión.
 *
 * Qué tiene que editar quien configure HubSpot: SOLO el bloque CONFIG de abajo.
 * ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------- CONFIGURACIÓN ----------------------------- */
  var CONFIG = {
    formId: 'form-contact',
    statusId: 'form-status',
    formName: 'contacto', // se envía al dataLayer para saber qué formulario fue

    hubspot: {
      // TODO: reemplazar por los valores reales de HubSpot.
      // Mientras digan "REEMPLAZAR...", el envío a HubSpot se omite (el resto funciona).
      portalId: '52123489', // número de la cuenta de HubSpot
      formGuid: 'e0609f89-f294-442f-b1cc-3960c411610a', // identificador largo del formulario en HubSpot

      // "campo en nuestro formulario" -> "nombre interno de la propiedad en HubSpot".
      // Los de la derecha DEBEN existir como campos dentro del formulario de HubSpot.
      fieldMap: {
        name: 'firstname',
        email: 'email',
        message: 'message'
      },

      // Solo poner true si el formulario de HubSpot tiene activado el
      // "consentimiento legal" (GDPR). Si no lo tiene, déjalo en false.
      sendConsent: false,
      consentText: 'Acepto la política de privacidad'
    },

    timeoutMs: 15000
  };

  /* ------------------------------- UTILIDADES ------------------------------ */
  window.dataLayer = window.dataLayer || [];

  // Avisa a GTM. IMPORTANTE: no enviar datos personales (nombre, correo...) aquí.
  function track(eventName, extra) {
    var payload = { event: eventName, form_name: CONFIG.formName };
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
    }
    window.dataLayer.push(payload);
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  // Guarda los UTM de la URL (de qué campaña llegó la persona) mientras dure la visita.
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  function getUtm() {
    var data = {};
    try {
      data = JSON.parse(sessionStorage.getItem('dp_utm') || '{}') || {};
    } catch (e) { data = {}; }
    try {
      var params = new URLSearchParams(window.location.search);
      UTM_KEYS.forEach(function (key) {
        var value = params.get(key);
        if (value) data[key] = value;
      });
      sessionStorage.setItem('dp_utm', JSON.stringify(data));
    } catch (e) { /* si el navegador bloquea el almacenamiento, seguimos sin UTM */ }
    return data;
  }

  function fetchWithTimeout(url, options) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, CONFIG.timeoutMs) : null;
    if (controller) options.signal = controller.signal;
    return fetch(url, options).then(
      function (response) { clearTimeout(timer); return response; },
      function (error) { clearTimeout(timer); throw error; }
    );
  }

  /* --------------------------------- ENVÍOS -------------------------------- */
  // 1) Web3Forms (el correo que ya llegaba antes)
  function sendWeb3Forms(form, utm) {
    var formData = new FormData(form);
    formData.delete('redirect'); // ya no se redirige: la página no se recarga
    Object.keys(utm).forEach(function (key) { formData.append(key, utm[key]); });

    return fetchWithTimeout(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data && (data.success === true || data.success === 'true')) return true;
        throw new Error((data && data.message) || 'Web3Forms respondió con error');
      });
  }

  // 2) HubSpot (crea el contacto)
  function hubspotConfigured() {
    var h = CONFIG.hubspot;
    return !!(h.portalId && h.formGuid &&
    h.portalId.indexOf('REEMPLAZAR') !== 0 &&
h.formGuid.indexOf('REEMPLAZAR') !== 0);
  }

  function sendHubspot(form) {
    var h = CONFIG.hubspot;
    var fields = [];

    Object.keys(h.fieldMap).forEach(function (localName) {
      var el = form.querySelector('[name="' + localName + '"]');
      if (el && el.value && el.value.trim()) {
        fields.push({ name: h.fieldMap[localName], value: el.value.trim() });
      }
    });

    var body = {
      submittedAt: Date.now(),
      fields: fields,
      context: { pageUri: window.location.href, pageName: document.title }
    };

    // Cookie del código de seguimiento de HubSpot (si está instalado): permite
    // asociar el contacto con las páginas que visitó antes de escribir.
    var hutk = getCookie('hubspotutk');
    if (hutk) body.context.hutk = hutk;

    if (h.sendConsent) {
      body.legalConsentOptions = {
        consent: { consentToProcess: true, text: h.consentText }
      };
    }

    var url = 'https://api.hsforms.com/submissions/v3/integration/submit/' +
      encodeURIComponent(h.portalId) + '/' + encodeURIComponent(h.formGuid);

    return fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      if (!response.ok) throw new Error('HubSpot respondió HTTP ' + response.status);
      return true;
    });
  }

  /* ------------------------------ INICIALIZACIÓN --------------------------- */
  function init() {
    var form = document.getElementById(CONFIG.formId);
    var statusEl = document.getElementById(CONFIG.statusId);
    if (!form) return;

    getUtm(); // guarda los UTM desde que la persona entra a la página

    var sending = false;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      // Campo trampa anti-spam: si está marcado, es un robot. No hacemos nada.
      var honeypot = form.querySelector('input[name="botcheck"]');
      if (honeypot && honeypot.checked) return;

      if (sending) return;
      sending = true;

      var button = form.querySelector('button[type="submit"]');
      var originalLabel = button ? button.textContent : '';
      if (button) { button.disabled = true; button.textContent = 'Enviando...'; }
      if (statusEl) { statusEl.style.color = '#ccc'; statusEl.textContent = ''; }

      var utm = getUtm();
      var results = {
        web3forms: 'pending',
        hubspot: hubspotConfigured() ? 'pending' : 'skipped'
      };

      var jobs = [
        sendWeb3Forms(form, utm).then(
          function () { results.web3forms = 'ok'; },
          function (err) { results.web3forms = 'error'; console.warn('[forms] Web3Forms:', err); }
        )
      ];

      if (results.hubspot === 'pending') {
        jobs.push(
          sendHubspot(form).then(
            function () { results.hubspot = 'ok'; },
            function (err) { results.hubspot = 'error'; console.warn('[forms] HubSpot:', err); }
          )
        );
      }

      Promise.all(jobs).then(function () {
        // Éxito si el mensaje quedó guardado en al menos uno de los dos destinos.
        var success = results.web3forms === 'ok' || results.hubspot === 'ok';

        if (success) {
          if (statusEl) {
            statusEl.style.color = '#8fd19e';
            statusEl.textContent = '¡Mensaje enviado! Te responderemos pronto.';
          }
          form.reset();
          track('form_submit', {
            web3forms_status: results.web3forms,
            hubspot_status: results.hubspot
          });
        } else {
          if (statusEl) {
            statusEl.style.color = '#e57373';
            statusEl.textContent = 'No se pudo enviar. Intenta de nuevo en un momento.';
          }
          track('form_error', {
            web3forms_status: results.web3forms,
            hubspot_status: results.hubspot
          });
        }
      }).then(function () {
        sending = false;
        if (button) { button.disabled = false; button.textContent = originalLabel || 'Enviar'; }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();