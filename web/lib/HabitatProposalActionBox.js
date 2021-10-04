import {
  wrapListener,
  getTokenV2,
  getConfig,
  ethers,
  getSigner,
  getShortAddr,
} from './utils.js';
import {
  getProviders,
  resolveName,
  getTokensForAccount,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TYPE_TRANSFER = 'Token Transfer';
const TYPE_MAINNET_EXECUTION = 'Mainnet Execution';
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
input {
  max-width: auto;
  min-width: auto;
  width: 100%;
  border-radius: 2em;
  background-color: var(--color-bg);
}
input[list] {
  cursor: pointer;
}
.dropdown::after {
  left: -2rem;
}

.mid {
  display: none;
  flex-direction: column;
  background-color: var(--color-accent-grey);
  border-radius: 2em;
  padding: 1em;
}

.ab {
  display: grid;
  gap: 1em;
  grid-template-columns: 1fr 1fr;
  place-items: end;
}

#sign {
  margin-top: -1.5em;
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
  display: none;
}

#contract {
  min-width: 42em;
}
#calldata {
  min-width: 42em;
}
</style>
<datalist id='actionlist'>
  <option value='${TYPE_TRANSFER}'>
  <option value='${TYPE_MAINNET_EXECUTION}'>
</datalist>
<datalist id='tokens'></datalist>
<div class='flex col'>
  <div style='padding:0 1em;width:100%;'>
    <label>
      <div class='dropdown'>
        <input id='action' autocomplete='off' list='actionlist' placeholder='Choose Action...'>
      </div>
    </label>
  </div>

  <div x-type='${TYPE_TRANSFER}' class='mid'>
    <div class='ab'>
      <label>
        <br>
        <div class='dropdown'>
          <input id='token' autocomplete='off' list='tokens' placeholder='Token'>
        </div>
      </label>
      <label>
        <div style='margin-left:.5em;'>
          <span>Available Balance: <a href='' id='available'></a></span>
        </div>
        <input id='amount' type='number' placeholder='Amount'>
      </label>
    </div>

    <div style='width:1.3em;height:2em;margin:0 auto;' class='mask-100 mask-arrow-group'></div>

    <label>
      <br>
      <input id='to' autocomplete='off' placeholder='To' style='min-width:32em;'>
    </label>
  </div>

  <div x-type='${TYPE_MAINNET_EXECUTION}' class='mid'>
    <label>
      Contract Address
      <input id='contract' autocomplete='off' placeholder='0x..'>
    </label>
    <label>
      Calldata
      <textarea id='calldata' autocomplete='off' placeholder='0x..'></textarea>
    </label>
  </div>

  <button id='sign' class='bigger'>Good Feeling</button>
  <space></space>
  <div class='flex col align-left'>
    <p class='s'>Other actions</p>
    <input style='display:none;' id='file' type='file' accept='text/csv'>
    <div class='flex row s'>
      <button id='csv'>Add Token Transfers from CSV</button>
    </div>
  </div>
</div>
`;

const ATTR_VAULT = 'vault';

export default class HabitatProposalActionBox extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_VAULT];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    this._to = this.shadowRoot.querySelector('#to');
    this._signButton = this.shadowRoot.querySelector('#sign');
    this._action = this.shadowRoot.querySelector('#action');
    this._token = this.shadowRoot.querySelector('#token');
    this._maxAmount = this.shadowRoot.querySelector('#available');

    wrapListener(this._action, this.onSelect.bind(this), 'change');
    wrapListener(this._token, this.onSelect.bind(this), 'change');
    wrapListener(this._signButton, this.onConfirm.bind(this));
    wrapListener(this._maxAmount, () => {
      this.shadowRoot.querySelector('#amount').value = this._maxAmount.textContent;
    });

    {
      function parseTransfers (str) {
        // very dumb csv parsing (incomplete)
        const SEP = ',';
        const ret = [];
        const lines = str.split('\n');

        // skip field definitions
        lines.shift();

        while (lines.length) {
          const fields = lines.shift().split(SEP);
          if (fields.length !== 3) {
            if (fields.length === 1) {
              // empty line?
              continue;
            }
            throw new Error('unexpected length of fields. Expected: [token address, receiver, amountOrId]');
          }

          const [token, to, amount] = fields;
          if (!ethers.utils.isAddress(token)) {
            throw new Error(`invalid token address ${token}`);
          }
          if (!ethers.utils.isAddress(to)) {
            throw new Error(`invalid receiver ${to}`);
          }

          ret.push({ token, to, amount });
        }
        return ret;
      }

      const fileInput = this.shadowRoot.querySelector('#file');
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        const str = await file.text();
        const transfers = parseTransfers(str);

        for (const { to, token, amount } of transfers) {
          const type = TYPE_TRANSFER;
          this.dispatchEvent(new CustomEvent('action', { detail: { type, to, token, amount } }));
        }
      }, false);
      this.shadowRoot.querySelector('#csv').addEventListener('click', () => fileInput.click(), false);
    }

    for (const element of this.shadowRoot.querySelectorAll('input[list]')) {
      element.addEventListener('input', (evt) => {
        if (!evt.target.list) {
          return;
        }
        for (const option of evt.target.list.options) {
          if (option.value === evt.target.value) {
            evt.target.blur();
            break;
          }
        }
      }, false);
      element.addEventListener('pointerdown', (evt) => {
        if (evt.target.readOnly || !evt.target.list) {
          return;
        }
        evt.target.value = '';
      }, false);
    }
  }

  connectedCallback () {
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  async attributeChangedCallback (name, oldValue, newValue) {
    if (name === ATTR_VAULT) {
      const tokens = await getTokensForAccount(newValue);
      const list = this.shadowRoot.querySelector('#tokens');
      list.replaceChildren();
      for (const obj of tokens) {
        const token = await getTokenV2(obj.address);
        const opt = document.createElement('option');
        const shortAddr = getShortAddr(token.address);
        opt.value = `${token.symbol} (${token.name}) ${shortAddr}`;
        list.append(opt);
      }
    }
  }

  async onSelect (evt) {
    for (const node of this.shadowRoot.querySelectorAll('.mid')) {
      node.style.display = 'none';
    }

    const type = this._action.value;

    if (type !== TYPE_MAINNET_EXECUTION && type !== TYPE_TRANSFER) {
      this.shadowRoot.querySelector('#sign').style.display = 'none';
      return;
    }

    this._signButton.textContent = `Add ${type}`;
    this.shadowRoot.querySelector(`[x-type="${type}"]`).style.display = 'flex';
    this.shadowRoot.querySelector('#sign').style.display = 'flex';

    if (type === TYPE_MAINNET_EXECUTION) {
      return;
    }

    if (type === TYPE_TRANSFER) {
      this._to.readOnly = false;
      this._to.value = '';
      this._to.removeAttribute('list');
    }

    let available = '0';
    if (this._token.value) {
      const account = this.getAttribute(ATTR_VAULT);
      if (!account) {
        return;
      }
      const token = await getTokenV2(this._token.value);
      const { habitat } = await getProviders();
      const availableAmount = BigInt(await habitat.callStatic.getUnlockedBalance(token.address, account));
      available = ethers.utils.formatUnits(availableAmount, token.decimals);
    }
    this._maxAmount.textContent = available;
  }

  async onConfirm (evt) {
    const type = this._action.value;

    if (type === TYPE_MAINNET_EXECUTION) {
      const to = this.shadowRoot.querySelector('#contract').value;
      const calldata = this.shadowRoot.querySelector('#calldata').value;
      this.dispatchEvent(new CustomEvent('action', { detail: { type, to, calldata } }));
    }

    if (type === TYPE_TRANSFER) {
      const t = await getTokenV2(this._token.value);
      const token = t.address;
      const amount = this.shadowRoot.querySelector('#amount').value;
      const to = await resolveName(this._to.value);

      this.dispatchEvent(new CustomEvent('action', { detail: { type, to, token, amount } }));
    }
  }
}

customElements.define('habitat-proposal-action-box', HabitatProposalActionBox);
