if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
  window.location.href = window.location.href.replace('http:', 'https:');
}

(function() {
  {
    document.documentElement.setAttribute('x-ready', '0');
    const css = document.createElement('style');
    css.innerHTML = '[x-ready="0"] .para > * {background-image: none !important;}';
    document.head.appendChild(css);
  }

  function fallback (hasWebP) {
    if (!hasWebP) {
      console.log('webp fallback');
      document.documentElement.setAttribute('webp-fallback', '1');
    }
    document.documentElement.setAttribute('x-ready', '1');
  }

  const img = new Image();
  img.onload = function() {
    fallback(img.height > 0 && img.width > 0);
  };
  img.onerror = function() {
    fallback(false);
  };
  img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEImI6H8gIjIAAA==';
})();
