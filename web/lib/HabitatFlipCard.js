import { COMMON_STYLESHEET } from './component.js';

const SVG_INFO_ICON = `
<svg class="info-svg" width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.93312 0.145752C1.81934 0.145752 0.124512 1.84058 0.124512 3.95436V17.2845H3.93312H13.4547C15.5684 17.2845 17.2633 15.5897 17.2633 13.4759V3.95436C17.2633 1.84058 15.5684 0.145752 13.4547 0.145752H3.93312ZM8.69389 3.00221C9.74126 3.00221 10.5982 3.85915 10.5982 4.90652C10.5982 5.95389 9.74126 6.81082 8.69389 6.81082C7.64652 6.81082 6.78958 5.95389 6.78958 4.90652C6.78958 3.85915 7.64652 3.00221 8.69389 3.00221ZM7.74174 7.76298H9.64604C10.1792 7.76298 10.5982 8.18192 10.5982 8.71513V13.4759C10.5982 14.0091 10.1792 14.428 9.64604 14.428H7.74174C7.20853 14.428 6.78958 14.0091 6.78958 13.4759V8.71513C6.78958 8.18192 7.20853 7.76298 7.74174 7.76298Z" fill="black"/>
</svg>`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.spaced-title {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.right-title {
  display: flex;
  justify-content: flex-end;
}
.flip-card {
  perspective: 40em;
  padding: 0;
}
.flip-wrapper {
  display: block;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}
.flip-card-front, .flip-card-back {
  position: relative;
  -moz-backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  margin: 0;
  border-radius: 2em;
  background-color: var(--color-box);
}
.flip-card-back {
  position: absolute;
  top: 0;
  color: var(--color-text-invert);
  transform: rotateY(180deg);
  background-color: var(--color-bg-invert);
  min-width: 20ch;
}
.flip-card-back * {
  color: var(--color-text-invert) !important;
  font-size: 1rem;
}
.flip {
  transform: rotateY(180deg);
}
.icon-info {
  cursor: pointer;
  align-self: flex-end;
  position: absolute;
  right: 1rem;
  top: 1rem;
}
.icon-info > svg > path {
  fill: var(--color-text);
}
.icon-flip > svg > path {
  fill: var(--color-text-invert) !important;
}
</style>
<div class='flip-card'>
  <div class='flip-wrapper'>
    <div class='left flip-card-front'>
      <div class='flex col'><span class='icon-info'>${SVG_INFO_ICON}</span></div>
      <slot name='front'></slot>
    </div>
    <div class='left flip-card-back'>
      <div class='flex col'><span class='icon-info icon-flip'>${SVG_INFO_ICON}</span></div>
      <div style='color:blue;'>
      <slot name='back'></slot>
      </div>
    </div>
  </div>
</div>`;

class HabitatFlipCard extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    for (const e of this.shadowRoot.querySelectorAll('.icon-info')) {
      e.addEventListener('click', () => {
        const wrapper = this.shadowRoot.querySelector('.flip-wrapper');
        //set front w/h dimensions to back
        this.parentElement.style.setProperty(`--backWidth`, `${this.shadowRoot.querySelector('.flip-card-front').clientWidth}px`, `important`);
        this.parentElement.style.setProperty(`--backHeight`, `${this.shadowRoot.querySelector('.flip-card-front').clientHeight}px`, `important`);
        //and use --backheight / --backwidth css vars

        const flipped = wrapper.classList.toggle('flip');
        if (flipped) {
          setTimeout(() => {
            wrapper.classList.remove('flip');
          }, 30000); // return to front side of card
        }
      }, false);
    }
  }
}
customElements.define('habitat-flip-card', HabitatFlipCard);
