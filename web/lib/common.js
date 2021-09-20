(function() {
  const ATTR_READY = 'x-ready';

  function fallback (hasWebP) {
    if (!hasWebP) {
      console.log('webp fallback');
      document.documentElement.setAttribute('webp-fallback', '');
    }
    document.documentElement.setAttribute(ATTR_READY, '');
    window.postMessage(ATTR_READY, window.location.origin);
  }

  const img = new Image();
  img.onload = function() {
    fallback(img.height > 0 && img.width > 0);
  };
  img.onerror = function() {
    fallback(false);
  };
  img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEImI6H8gIjIAAA==';

  window.addEventListener('DOMContentLoaded', function () {
    document.documentElement.style.setProperty('--x-loaded', 'block');
  }, false);
})();
