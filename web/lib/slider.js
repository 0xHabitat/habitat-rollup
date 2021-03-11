const TEMPLATE =
`
<div id='inner'><pin></pin></div>
`;

class HabitatSlider extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
    this.inner = this.children[0];
    this.pin = this.children[0].children[0];
    this.active = false;
    this.min = 0;
    this.cap = 0;
    this.max = 0;
    this.value = 0;
    this._width = 0;
    this._x = 0;

    this.addEventListener('mousedown', (evt) => this.handleDown(evt), false);
    this.addEventListener('mouseup', (evt) => this.handleUp(evt), false);
    this.addEventListener('mousemove', (evt) => this.handleMove(evt), false);
    this.addEventListener('mouseleave', (evt) => this.handleLeave(evt), false);
  }

  setRange (min, cap, max) {
    this.max = Number(max);
    this.cap = Number(cap);
    this.min = Number(min);

    this._width = this.offsetWidth;
    this._x = (this._width * (this.cap / this.max));

    window.requestAnimationFrame(() => this.update());
  }

  handleLeave (evt) {
    this.active = false;
    this.dispatchEvent(new Event('release'));
  }

  handleDown (evt) {
    this.active = true;
    this._width = this.offsetWidth;
    if (evt.target === this.pin) {
      return;
    }
    this._x = evt.offsetX;
    window.requestAnimationFrame(() => this.update());
  }

  handleUp (evt) {
    this.active = false;
    window.requestAnimationFrame(() => this.update());
    this.dispatchEvent(new Event('release'));
  }

  handleMove (evt) {
    if (!this.active || evt.target === this.pin) {
      return;
    }
    this._x = evt.offsetX;
    window.requestAnimationFrame(() => this.update());
  }

  update () {
    const max = this.cap / this.max;
    const min = this.min / this.max;
    const x = Math.max(Math.min(this._width * max, this._x), this._width * min);
    const percent = Math.round((x / this._width) * 100);
    this._x = x;
    this.value = Math.max(Math.min(this.cap, (this.max * percent) / 99), this.min);
    this.inner.style.width = `${percent}%`;

    this.dispatchEvent(new Event('change'));
  }
}

customElements.define('habitat-slider', HabitatSlider);
