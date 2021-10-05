let ele;
let toggledOnce = false;
let cur;
const STORAGE_KEY = 'colorSchemeToggle';
const ATTR_THEME = 'data-theme';

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

function setColor (tmp) {
  cur = tmp;
  document.documentElement.setAttribute(ATTR_THEME, tmp);
  window.postMessage(ATTR_THEME, window.location.origin);
}

function detectColorScheme () {
  setColor(getColor());
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectColorScheme, false);
}

cur = localStorage.getItem(STORAGE_KEY);
if (cur) {
  toggledOnce = true;
}
// fix any settings after page load
// we do this w/ a delay because of a race condition in certain browser's DOM handling
window.requestAnimationFrame(detectColorScheme);

const TEMPLATE = `
<style>
@import '/lib/emoji/emoji.css';

#colorSchemeToggle {
  font-size: 1.5em;
  width: 1em;
  height: 1em;
  overflow: hidden;
  cursor: pointer;
  -webkit-user-select: none;
}
#colorSchemeToggle > div {
  transition: all .1s linear;
}
#colorSchemeToggle > div > div {
  width: 1em;
  height: 1em;
  line-height: 1;
}
#colorSchemeToggle.light > div {
  margin-top: -1em;
}
</style>
<div id='colorSchemeToggle'>
  <div>
    <div>
      <emoji-sun></emoji-sun>
    </div>
    <div>
      <emoji-crescent-moon></emoji-crescent-moon>
    </div>
  </div>
</div>
`;

class HabitatColorToggle extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;

    this.shadowRoot.children[1].addEventListener('click', this, false);
  }

  connectedCallback () {
    this.shadowRoot.children[1].className = getColor();
  }

  handleEvent (evt) {
    return this[evt.type](evt);
  }

  click (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();

    const tmp = cur === 'dark' ? 'light' : 'dark';
    toggledOnce = true;
    setColor(tmp);
    this.shadowRoot.children[1].className = getColor();
    localStorage.setItem(STORAGE_KEY, tmp);
  }
}
customElements.define('habitat-color-toggle', HabitatColorToggle);
