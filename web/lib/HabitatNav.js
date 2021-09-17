import {
  getSigner,
  wrapListener,
  getConfig,
} from './utils.js';

import './HabitatColorToggle.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.wrapperNav {
  top: 0;
  left: 0;
  right: 0;
  position: sticky;
  padding: 1rem 0;
  background-color: var(--color-bg);
}
</style>
<div class='wrapperNav'>
  <div class='flex row center around' style='padding-right:3rem;'>
    <div class='flex col left' style='align-items:flex-start;'>
      <div class='flex col'>
        <a href='/' class='mask-contain mask-logo' style='display:block;width:10em;height:2em;background-color:var(--color-bg-invert);'></a>
      </div>
      <button id='add747' style='margin:.3rem 0;font-size:.6em;' class='secondary purple'>Add HBT to MetaMask</button>
    </div>
    <div class='flex row evenly'>
      <habitat-color-toggle style='margin:0 1em;'></habitat-color-toggle>
    </div>
  </div>
</div>`;

class HabitatNav extends HTMLElement {
  constructor() {
    super();

  }

  connectedCallback () {
    if (!this.children.length) {
      this.append(TEMPLATE.content.cloneNode(true));

      wrapListener(
        this.querySelector('#add747'),
        async () => {
          // EIP-747
          const { HBT } = getConfig();
          const signer = await getSigner();
          await signer.provider.send(
            'metamask_watchAsset',
            {
              type: 'ERC20',
              options: {
                address: HBT,
                symbol: 'HBT',
                decimals: 10,
                image: 'https://0xhabitat.org/lib/assets/logo.png',
              }
            }
          );
        }
      );
    }
  }
}
customElements.define('habitat-nav', HabitatNav);
