const TEMPLATE =
`
<div class='circle'>
  <div class='inner flex col center'>
    <h1 id='signal'>-</h1>
    <p id='tag'> </p>
  </div>
</div>
`;

export default class HabitatCircle extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
    this._signalElement = this.querySelector('#signal');
    this._tag = this.querySelector('#tag');
  }

  setValue (signalStrength, val, tag) {
    const color = window.getComputedStyle(this).getPropertyValue('--circle-gradient') || 'black';
    this._signalElement.parentElement.parentElement.style.background =
      `linear-gradient(180deg, var(--color-bg) ${100 - signalStrength}%, ${color})`;

    this._signalElement.textContent = val;
    this._tag.textContent = tag || this.getAttribute('tag') || ' ';
  }
}

customElements.define('habitat-circle', HabitatCircle);
