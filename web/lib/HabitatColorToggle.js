let ele;
let toggledOnce = false;
let cur;
const STORAGE_KEY = 'colorSchemeToggle';

function getColor () {
  let tmp = 'light';

  if (window.matchMedia) {
    // xxx: disable auto detection
    //tmp = window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
  }

  if (toggledOnce && cur) {
    tmp = cur;
  }

  return tmp;
}

function detectColorScheme () {
  setColor(getColor());
}

function setColor (tmp) {
  cur = tmp;

  if (ele) {
    ele.className = tmp;
  }

  document.documentElement.setAttribute('data-theme', tmp);
}

function onClick (evt) {
  evt.preventDefault();
  evt.stopImmediatePropagation();

  const tmp = ele.className === 'dark' ? 'light' : 'dark';
  toggledOnce = true;
  setColor(tmp);
  localStorage.setItem(STORAGE_KEY, tmp);
}

function addColorSchemeToggle (_ele) {
  ele = _ele;
  ele.className = getColor();
  ele.innerHTML = '<div><div><emoji-sunny></emoji-sunny></div><div><emoji-crescent-moon></emoji-crescent-moon></div></div>';
  ele.addEventListener('click', onClick, false);
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectColorScheme, false);
}

const TEMPLATE =
`
<div id='colorSchemeToggle'></div>
`;

class HabitatColorToggle extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
    addColorSchemeToggle(this.querySelector('div#colorSchemeToggle'));
    cur = localStorage.getItem(STORAGE_KEY);
    if (cur) {
      toggledOnce = true;
    }
    // fix any settings after page load
    // we do this w/ a delay because of a race condition in certain browser's DOM handling
    window.requestAnimationFrame(detectColorScheme);
  }
}

customElements.define('habitat-color-toggle', HabitatColorToggle);
