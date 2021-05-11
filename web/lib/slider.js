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
    this.scheduled = false;
    this.min = 0;
    this.cap = 0;
    this.max = 0;
    this.defaultValue = 0;
    this.value = 0;
    this.percent = 0;
    this._width = 0;
    this._x = 0;

    this.addEventListener('mousedown', this, false);
    this.addEventListener('mouseup', this, false);
    this.addEventListener('mousemove', this, false);
    this.addEventListener('mouseleave', this, false);
  }

  handleEvent (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    this[evt.type](evt);
  }

  setRange (min, cap, max, defaultValue) {
    this.max = Number(max) || 1;
    this.cap = Number(cap);
    this.min = Number(min);
    this.defaultValue = defaultValue !== undefined ? Number(defaultValue) : this.cap;

    this._width = this.offsetWidth;
    this._x = (this._width * (this.defaultValue / this.max));

    this.scheduleUpdate();
  }

  mouseleave (evt) {
    if (!this.active) {
      return;
    }
    this.active = false;
    this._x = evt.offsetX;
    this.update();
    this.dispatchEvent(new Event('release'));
  }

  mousedown (evt) {
    this.active = true;
    this._width = this.offsetWidth;
    if (evt.target === this.pin) {
      return;
    }
    this._x = evt.offsetX;
    this.scheduleUpdate();
  }

  mouseup (evt) {
    this.active = false;
    this.scheduleUpdate();
    this.dispatchEvent(new Event('release'));
  }

  mousemove (evt) {
    if (!this.active || evt.target === this.pin) {
      return;
    }
    this._x = evt.offsetX;
    this.scheduleUpdate();
  }

  scheduleUpdate () {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    window.requestAnimationFrame(() => this.update());
  }

  update () {
    this.scheduled = false;
    const max = this.cap / this.max;
    const min = this.min / this.max;
    const x = Math.max(Math.min(this._width * max, this._x), this._width * min);
    this.percent = Math.round((x / this._width) * 100);
    this._x = x;
    this.value = Math.max(Math.min(this.cap, (this.max * this.percent) / 100), this.min);
    this.percent = percent;
    this.inner.style['padding-left'] = `${this.percent}%`;

    this.dispatchEvent(new Event('change'));
  }
}

customElements.define('habitat-slider', HabitatSlider);
