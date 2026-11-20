// Carbon theme controls. Every DOM/storage API is guarded for static and restricted contexts.
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var root = document.documentElement;
  var accents = ['blue', 'orange', 'silver'];
  var defaults = { accent: 'blue', weave: 'on', glow: 'on' };
  var toastHost;

  function storageGet(key, fallback) {
    try { return localStorage.getItem('yarkin-' + key) || fallback; } catch (_) { return fallback; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem('yarkin-' + key, value); } catch (_) {}
  }
  function toast(message) {
    try {
      if (!toastHost) {
        toastHost = document.createElement('div');
        toastHost.className = 'carbon-toasts';
        toastHost.setAttribute('aria-live', 'polite');
        toastHost.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toastHost);
      }
      var item = document.createElement('div');
      item.className = 'carbon-toast';
      item.textContent = message;
      toastHost.appendChild(item);
      window.setTimeout(function () { if (item.parentNode) item.remove(); }, 2800);
    } catch (_) {}
  }
  function syncAccents(value) {
    document.querySelectorAll('[data-accent]').forEach(function (button) {
      if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', button.getAttribute('data-accent') === value ? 'true' : 'false');
    });
  }
  function setAccent(value, persist) {
    if (accents.indexOf(value) < 0) return;
    root.setAttribute('data-accent', value);
    if (persist) storageSet('accent', value);
    syncAccents(value);
  }
  function setToggle(name, value, persist) {
    if (value !== 'on' && value !== 'off') return;
    root.setAttribute('data-' + name, value);
    var control = document.getElementById(name === 'weave' ? 'tgWeave' : 'tgGlow');
    if (control) control.checked = value === 'on';
    if (persist) storageSet(name, value);
  }
  function exportTokens() {
    try {
      var style = window.getComputedStyle(root);
      var names = ['bg0','bg1','bg2','bg3','surface','surface-2','line','line-2','txt','mut','dim','ok','warn','bad','info','steel-1','steel-2','steel-3','acc','acc-2','acc-ink','acc-soft','acc-glow','radius'];
      var text = ':root{\n' + names.map(function (name) { return '  --' + name + ':' + style.getPropertyValue('--' + name).trim() + ';'; }).join('\n') + '\n}';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('CSS-переменные скопированы'); }).catch(function () { fallbackCopy(text); });
      } else fallbackCopy(text);
    } catch (_) { toast('Не удалось экспортировать CSS'); }
  }
  function fallbackCopy(text) {
    try {
      var area = document.createElement('textarea');
      area.value = text; area.setAttribute('readonly', '');
      area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      var ok = document.execCommand && document.execCommand('copy');
      area.remove(); toast(ok ? 'CSS-переменные скопированы' : 'Копирование недоступно');
    } catch (_) { toast('Копирование недоступно'); }
  }

  setAccent(storageGet('accent', defaults.accent), false);
  setToggle('weave', storageGet('weave', defaults.weave), false);
  setToggle('glow', storageGet('glow', defaults.glow), false);
  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('button[data-accent]') : null;
    if (button) { setAccent(button.getAttribute('data-accent'), true); toast('Цвет акцента изменён'); }
  });
  var weave = document.getElementById('tgWeave');
  if (weave) weave.addEventListener('change', function () { setToggle('weave', weave.checked ? 'on' : 'off', true); });
  var glow = document.getElementById('tgGlow');
  if (glow) glow.addEventListener('change', function () { setToggle('glow', glow.checked ? 'on' : 'off', true); });
  var reset = document.getElementById('resetTheme');
  if (reset) reset.addEventListener('click', function () {
    try { ['accent', 'weave', 'glow'].forEach(function (key) { localStorage.removeItem('yarkin-' + key); }); } catch (_) {}
    setAccent(defaults.accent, false); setToggle('weave', defaults.weave, false); setToggle('glow', defaults.glow, false); toast('Настройки темы сброшены');
  });
  var exportButton = document.getElementById('exportTheme');
  if (exportButton) exportButton.addEventListener('click', exportTokens);
})();
