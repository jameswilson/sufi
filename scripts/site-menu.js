(function () {
  var root = document.documentElement;
  var btn = document.querySelector('[data-menu-button]');
  var overlay = document.getElementById('site-nav-overlay');
  var nav = document.getElementById('site-nav');

  if (!btn || !overlay || !nav) return;

  function isOpen() {
    return root.classList.contains('menu-open');
  }

  function setOpen(open) {
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      var firstLink = nav.querySelector('a[href]');
      if (firstLink) firstLink.focus();
      return;
    }
  }

  btn.addEventListener('click', function () {
    setOpen(!isOpen());
  });

  overlay.addEventListener('click', function () {
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape' && isOpen()) {
      setOpen(false);
    }
  });

  setOpen(false);
})();
