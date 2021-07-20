const TEMPLATE =
`
<style>
habitat-toggle,
habitat-toggle #inner,
habitat-toggle pin {
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

habitat-toggle {
  border-radius: 2em;
}

habitat-toggle #inner {
  height: 1em;
  width: 2em;
  border-radius: 2em;
  border: 1px solid var(--color-bg-invert);
  transition: all .07s linear;
  background: var(--color-bg);
  background-clip: content-box;
}

habitat-toggle pin {
  display: block;
  position: relative;
  top: -1px;
  left: -1px;
  width: 1em;
  height: 1em;
  max-width: 1em;
  min-width: 0;
  margin: 0;
  padding: 0;
  margin-left: 0;
  border-radius: 100%;
  border: 1px solid var(--color-bg-invert);
  cursor: pointer;
  background-color: var(--color-bg);
}

habitat-toggle button:hover,
habitat-toggle button:focus,
habitat-toggle button:active {
  transition: none;
  box-shadow:none;
}

habitat-toggle.on,
habitat-toggle.on #inner {
  background-color: var(--color-bg-invert);
}
habitat-toggle.on #inner {
  padding-left: 1em;
}
</style>
<div id='inner'><pin></pin></div>
`;

class HabitatToggle extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
    this.addEventListener('click', () => {
      this.classList.toggle('on');
      this.dispatchEvent(new Event('toggle'));
    }, false);
  }
}
customElements.define('habitat-toggle', HabitatToggle);
