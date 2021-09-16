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

  const len = content.children.length;
  const maxCollapsed = ele.isConnected ? len - 1 : len;
  const PAD = 1.9;
  let pos = 0;
  for (let i = 0; i < len; i++) {
    const child = content.children[i];
    if (child === ele) {
      continue;
    }
    child.style.top = `${PAD + (PAD * pos)}em`;
    child.style.transform = `translateX(${1 * maxCollapsed - pos}em)`;
    child.classList.add('contentHidden');
    child.style.zIndex = pos;
    pos++;
  }
  ele.style.zIndex = pos;
  ele.style.top = `${PAD + (PAD * pos)}em`;
  ele.style.transform = 'none';
  ele.classList.remove('contentHidden');
  ele.style.animation = '';
  ele.onanimationend = () => {
    ele.style.animation = 'none';
  }
  if (!ele.isConnected) {
    content.append(ele);
  }
  ele.setAttribute('args', window.location.hash)
}

window.addEventListener('DOMContentLoaded', onNavigate, false);
window.addEventListener('hashchange', onNavigate, false);
