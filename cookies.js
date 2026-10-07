/*
 * Banner de cookies + Google Consent Mode v2 (DecoPared)
 * - El valor por defecto "denied" se define en <head> ANTES de GTM.
 * - Aquí solo se muestra el banner y se actualiza el consentimiento.
 * - La elección se guarda en localStorage ('decopared_consent': 'granted' | 'denied').
 */
(function () {
  var KEY = 'decopared_consent';

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  function readChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* sin almacenamiento */ }
  }

  function applyConsent(value) {
    // Solo medición (analytics). No hay publicidad, así que ad_* se queda en denied.
    window.gtag('consent', 'update', { analytics_storage: value });
  }

  function buildBanner() {
    var el = document.createElement('div');
    el.id = 'cookie-banner';
    el.className = 'cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'cookie-banner-title');
    el.setAttribute('aria-describedby', 'cookie-banner-text');
    el.hidden = true;
    el.innerHTML =
      '<h2 id="cookie-banner-title" class="cookie-banner__title">Tu privacidad</h2>' +
      '<p id="cookie-banner-text" class="cookie-banner__text">' +
      'Usamos cookies de medición para entender cómo se usa el sitio y mejorarlo. ' +
      'Solo se activan si las aceptas. ' +
      '<a href="politica-privacidad.html">Política de privacidad</a>.</p>' +
      '<div class="cookie-banner__actions">' +
      '<button type="button" class="cookie-btn cookie-btn--ghost" data-consent="denied">Rechazar</button>' +
      '<button type="button" class="cookie-btn cookie-btn--solid" data-consent="granted">Aceptar cookies</button>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var banner = buildBanner();

    function show() {
      banner.hidden = false;
      var first = banner.querySelector('button');
      if (first) { first.focus({ preventScroll: true }); }
    }

    function hide() { banner.hidden = true; }

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) { return; }
      var value = btn.getAttribute('data-consent');
      saveChoice(value);
      applyConsent(value);
      hide();
    });

    // Enlace del footer para volver a elegir
    document.addEventListener('click', function (e) {
      var link = e.target.closest('#cookie-settings');
      if (!link) { return; }
      e.preventDefault();
      show();
    });

    // Primera visita: aún no hay elección guardada
    if (!readChoice()) { show(); }
  });
})();