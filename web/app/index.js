function onNavigate (evt) {
  const content = document.querySelector('#content');
  const hash = window.location.hash;
  if (!hash) {
    window.location.hash =
      (content.lastElementChild ? content.lastElementChild.getAttribute('args') : null) || '#habitat-communities';
    return;
  }
  const args = hash.substring(1, hash.length).split(',');
  const name = args[0];
  const ele = document.querySelector(`[args="${hash}"]`) || document.createElement(name);
  ele.remove();

  const len = content.children.length;
  ele.style.top = `${2 + (2 * len)}em`;
  ele.style.marginLeft = '0';

  let skipped = false;
  for (let i = 0; i < len; i++) {
    const child = content.children[i];
    const pos = skipped ? i - 1 : i;
    child.style.top = `${2 + (2 * pos)}em`;
    child.style.marginLeft = `${1 * len-pos}em`;
    child.classList.add('contentHidden');
    // remove once content-visibility is more widely supported
    child.style.height = '2em';
  }

  ele.style.height = 'initial';
  ele.classList.remove('contentHidden');
  ele.style.animation = '';
  ele.onanimationend = () => {
    ele.style.animation = 'none';
  }
  content.append(ele);
  ele.setAttribute('args', window.location.hash)
}

window.addEventListener('DOMContentLoaded', onNavigate, false);
window.addEventListener('hashchange', onNavigate, false);
