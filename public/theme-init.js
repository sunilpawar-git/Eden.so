(function () {
  try {
    var VALID = ['light', 'dark', 'sepia', 'grey', 'darkBlack'];
    var stored = localStorage.getItem('settings-theme');
    var theme;
    if (stored && VALID.indexOf(stored) !== -1) {
      theme = stored;
    } else if (stored === 'system' || !stored) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      theme = 'light';
    }
    document.documentElement.dataset.theme = theme;
  } catch (e) { /* localStorage may be blocked in some contexts */ }
})();
