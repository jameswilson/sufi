(function () {
  var ORDER = ['system', 'light', 'dark'];
  var btn = document.getElementById('toggle-theme');
  var STORAGE_KEY = 'theme';
  var EVENT_NAME = 'themechoice';

  if (!btn) return;

  function getChoice() {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  }

  function setChoice(choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: choice }));
  }

  function syncThemeUi(choice) {
    choice = choice || getChoice();
    var svgs = btn.querySelectorAll('[data-preset]');
    for (var i = 0; i < svgs.length; i++) {
      var on = svgs[i].getAttribute('data-preset') === choice;
      svgs[i].style.display = on ? 'block' : 'none';
    }
    btn.setAttribute(
      'aria-label',
      'Theme: ' + choice + '. Click to cycle system, light, dark.'
    );
  }

  function cycleTheme() {
    var i = ORDER.indexOf(getChoice());
    var next = ORDER[(i + 1) % ORDER.length];
    setChoice(next);
    syncThemeUi(next);
  }

  btn.addEventListener('click', cycleTheme);
  window.addEventListener('storage', function (e) {
    if (e && e.key === STORAGE_KEY) {
      syncThemeUi(e.newValue || 'system');
    }
  });
  syncThemeUi(getChoice());
})();
