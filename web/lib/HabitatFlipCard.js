import { COMMON_STYLESHEET } from './component.js';

const SVG_INFO_ICON = `
<svg class="info-svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9584 4.25H12.0416C13.4108 4.24999 14.4957 4.24999 15.3621 4.33812C16.2497 4.42841 16.9907 4.61739 17.639 5.05052C18.1576 5.39707 18.6029 5.84239 18.9495 6.36104C19.3826 7.00926 19.5716 7.7503 19.6619 8.63794C19.75 9.5043 19.75 10.5892 19.75 11.9584V12.0416C19.75 13.4108 19.75 14.4957 19.6619 15.3621C19.5716 16.2497 19.3826 16.9907 18.9495 17.639C18.6029 18.1576 18.1576 18.6029 17.639 18.9495C16.9907 19.3826 16.2497 19.5716 15.3621 19.6619C14.4957 19.75 13.4108 19.75 12.0416 19.75H11.9584C10.5892 19.75 9.5043 19.75 8.63794 19.6619C7.7503 19.5716 7.00926 19.3826 6.36104 18.9495C5.84239 18.6029 5.39707 18.1576 5.05052 17.639C4.61739 16.9907 4.42841 16.2497 4.33812 15.3621C4.24999 14.4957 4.24999 13.4108 4.25 12.0416V11.9584C4.24999 10.5892 4.24999 9.5043 4.33812 8.63794C4.42841 7.7503 4.61739 7.00926 5.05052 6.36104C5.39707 5.84239 5.84239 5.39707 6.36104 5.05052C7.00926 4.61739 7.7503 4.42841 8.63794 4.33812C9.5043 4.24999 10.5892 4.24999 11.9584 4.25ZM11.1464 8.14645C11 8.29289 11 8.5286 11 9C11 9.4714 11 9.70711 11.1464 9.85355C11.2929 10 11.5286 10 12 10C12.4714 10 12.7071 10 12.8536 9.85355C13 9.70711 13 9.4714 13 9C13 8.5286 13 8.29289 12.8536 8.14645C12.7071 8 12.4714 8 12 8C11.5286 8 11.2929 8 11.1464 8.14645ZM11.1464 11.1464C11 11.2929 11 11.5286 11 12V15C11 15.4714 11 15.7071 11.1464 15.8536C11.2929 16 11.5286 16 12 16C12.4714 16 12.7071 16 12.8536 15.8536C13 15.7071 13 15.4714 13 15V12C13 11.5286 13 11.2929 12.8536 11.1464C12.7071 11 12.4714 11 12 11C11.5286 11 11.2929 11 11.1464 11.1464Z" fill="black"/>
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
}
.flip-card-back {
  position: absolute;
  top: 0;
  padding: 2rem 1rem;
  color: var(--color-text-invert);
  transform: rotateY(180deg);
  background-color: var(--color-bg-invert);
  min-width: 20ch;
}
.flip-card-back * {
  color: var(--color-text-invert) !important;
  margin-top: 1rem !important;
  font-size: 1rem;
}
.flip {
  transform: rotateY(180deg);
}
.icon-info {
  cursor: pointer;
  align-self: flex-end;
  position: absolute;
  right: .5rem;
  top: .5rem;
}
.icon-info > svg > path {
  fill: var(--color-text);
}
.icon-flip > svg > path {
  fill: var(--color-text-invert) !important;
}
.icon-flip {
  top: -1rem;
}
</style>
<div class='flip-card'>
  <div class='flip-wrapper'>
    <div class='left box flip-card-front'>
      <div class='flex col'><span class='icon-info'>${SVG_INFO_ICON}</span></div>
      <slot name='front'></slot>
    </div>
    <div class='left box flip-card-back'>
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
