import { COMMON_STYLESHEET } from './component.js';
import {
  wrapListener,
  getTokenV2,
  getConfig,
  ethers,
  getSigner,
  signPermit,
  setupTokenlistV2,
  getShortAddr,
  encodeMultiCall
} from './utils.js';
import {
  getProviders,
  resolveName,
  getErc20Exit,
  sendTransaction,
  getTokensForAccount,
  onChainUpdate,
} from './rollup.js';
import HabitatCircle from '/lib/HabitatCircle.js';
import bananaFever from './banana.js';

const { DEFAULT_ROLLUP_OPERATOR_ADDRESS } = getConfig();

const L1_STR = '♢ Ethereum Mainnet';
const L2_STR = '🏕 Habitat Rollup';
const OPERATOR_STR = '⛽️ Rollup Operator';
const TYPE_DEPOSIT = 'Deposit';
const TYPE_WITHDRAW = 'Withdraw';
const TYPE_TRANSFER = 'Transfer';
const TYPE_EXIT = 'Exit';
const TYPE_TOP_UP = 'Top Up Gas Tank';

const WITHDRAW_WARNING = `A Withdraw request can take 7-10 days.`;
const EXIT_NOTE = `Collect funds after a Withdraw is finalized.`;

async function l2Transfer ({ to, token, amount }) {
  const value = ethers.utils.parseUnits(amount, token.decimals).toHexString();
  const args = {
    token: token.address,
    to,
    value
  };

  return sendTransaction('TransferToken', args);
}

async function l1Transfer ({ to, token, amount }) {
  const value = ethers.utils.parseUnits(amount, token.decimals).toHexString();
  const tx = await token.contract.connect(await getSigner()).transfer(to, value);

  return tx.wait();
}


async function deposit ({ token, amount }) {
  const { MULTI_CALL_HELPER } = getConfig();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const { habitat } = await getProviders();
  const value = ethers.utils.parseUnits(amount, token.decimals).toHexString();
  const multi = [];

  if (token.isETH) {
    multi.push(
      {
        // wrap ETH
        address: token.address,
        calldata: '0x',
        value: value
      }
    );
  } else {
    const allowance = await token.contract.allowance(account, habitat.address);
    if (allowance.lt(value)) {
      let permit;
      try {
        permit = await signPermit(token.contract, signer, MULTI_CALL_HELPER, value);
        multi.push(
          {
            address: token.address,
            calldata: permit.permitData,
            value: 0
          }
        );
      } catch (e) {
        console.log(e);
      }

      if (!permit) {
        const tx = await token.contract.connect(signer).approve(habitat.address, value);
        await tx.wait();
      }
    }
  }

  let tx;
  if (multi.length) {
    if (!token.isETH) {
      multi.push(
        {
          address: token.address,
          calldata: token.interface.encodeFunctionData('transferFrom', [account, MULTI_CALL_HELPER, value]),
          value: 0
        }
      );
    }

    multi.push(
      {
        address: token.address,
        calldata: token.interface.encodeFunctionData('approve', [habitat.address, value]),
        value: 0
      },
      {
        address: habitat.address,
        calldata: habitat.interface.encodeFunctionData('deposit', [token.address, value, account]),
        value: 0
      }
    );

    console.log(multi);
    tx = {
      to: MULTI_CALL_HELPER,
      data: encodeMultiCall(multi),
      value: token.isETH ? value : '0x0'
    };
  } else {
    tx = {
      to: habitat.address,
      data: habitat.interface.encodeFunctionData('deposit', [token.address, value, account])
    };
  }

  console.log(tx);
  tx = await signer.sendTransaction(tx);

  return tx.wait();
}

async function exit ({ token, amount }) {
  const signer = await getSigner();
  const account = await signer.getAddress();
  const { habitat } = await getProviders();
  const tx = await habitat.connect(signer).withdraw(account, token.address, 0);

  return tx.wait();
}

async function withdraw ({ token, amount }) {
  const value = ethers.utils.parseUnits(amount, token.decimals).toHexString();
  const args = {
    token: token.address,
    to: ethers.constants.AddressZero,
    value
  };
  await sendTransaction('TransferToken', args);
}

async function topUpGas ({ token, amount }) {
  const value = ethers.utils.parseUnits(amount, token.decimals).toHexString();
  const args = {
    operator: DEFAULT_ROLLUP_OPERATOR_ADDRESS,
    token: token.address,
    amount: value
  };
  await sendTransaction('TributeForOperator', args);
}

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

#mid {
  background-color: var(--color-accent-grey);
  border-radius: 2em;
  padding: 1em;
}

#ab {
  display: grid;
  gap: 1em;
  grid-template-columns: 1fr .5fr;
  place-items: end;
}

#sign {
  margin-top: -1.5em;
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
}
</style>
<datalist id='networklist'>
  <option value='${L1_STR}'>
  <option value='${L2_STR}'>
</datalist>
<datalist id='actionlist'>
  <option value='${TYPE_DEPOSIT}'>
  <option value='${TYPE_TRANSFER}'>
  <option value='${TYPE_TOP_UP}'>
  <option value='${TYPE_WITHDRAW}'>${WITHDRAW_WARNING}</option>
  <option value='${TYPE_EXIT}'>${EXIT_NOTE}</option>
</datalist>
<datalist id='tokenboxlist'></datalist>
<div class='flex col'>
  <div style='padding:0 1em;width:100%;'>
    <label>
      <div class='dropdown'>
        <input id='action' autocomplete='off' list='actionlist' placeholder='Choose Action...'>
      </div>
    </label>
  </div>

  <div id='mid'>
    <label>
      <div class='dropdown'>
        <input id='from' list='networklist' placeholder='Network'>
      </div>
    </label>

    <div id='ab'>
      <label>
        <br>
        <div class='dropdown'>
          <input id='token' autocomplete='off' list='tokenlistv2' placeholder='Token'>
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
      <div class='dropdown'>
        <input id='to' autocomplete='off' list='networklist' placeholder='To'>
      </div>
    </label>
  </div>

  <button id='sign' class='bigger'>Good Feeling</button>
  <space></space>
  <p id='feedback' class='big'> </p>
</div>
`;

export default class HabitatTransferBox extends HTMLElement {
  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    setupTokenlistV2(this.shadowRoot);

    this._from = this.shadowRoot.querySelector('#from');
    this._to = this.shadowRoot.querySelector('#to');
    this._signButton = this.shadowRoot.querySelector('#sign');
    this._action = this.shadowRoot.querySelector('#action');
    this._token = this.shadowRoot.querySelector('#token');
    this._maxAmount = this.shadowRoot.querySelector('#available');

    wrapListener(this._action, this.onSelect.bind(this), 'change');
    wrapListener(this._token, this.onSelect.bind(this), 'change');
    wrapListener(this._from, this.onSelect.bind(this), 'change');
    wrapListener(this._signButton, this.onSign.bind(this));
    wrapListener(this._maxAmount, () => {
      this.shadowRoot.querySelector('#amount').value = this._maxAmount.textContent;
    });

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
    window.addEventListener('message', this);
    this.update();
  }

  disconnectedCallback () {
    window.removeEventListener('message', this);
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
  }

  handleEvent (evt) {
    if (evt.data.type === 'hbt-transfer-box-action') {
      const newValue = evt.data.value;
      const actionValue = this.shadowRoot.querySelector('#action');
      const tokenValue = this.shadowRoot.querySelector('#token');
      if (newValue && actionValue !== null) {
        actionValue.value = newValue;
        actionValue.dispatchEvent(new Event('change'));

        if (newValue === TYPE_TOP_UP && tokenValue !== null) {
          tokenValue.value = 'HBT Habitat Token';
          tokenValue.dispatchEvent(new Event('change'));
        }
      }
    }
  }

  async onSelect (evt) {
    const type = this._action.value;

    if (type) {
      this._signButton.textContent = type;
    }

    if (type === TYPE_DEPOSIT) {
      this._from.value = L1_STR;
      this._from.readOnly = true;

      this._to.value = L2_STR;
      this._to.readOnly = true;
      this._to.setAttribute('list', 'networklist');
    }
    if (type === TYPE_WITHDRAW || type === TYPE_EXIT) {
      this._from.value = L2_STR;
      this._from.readOnly = true;

      this._to.value = L1_STR;
      this._to.readOnly = true;
      this._to.setAttribute('list', 'networklist');

      if (type === TYPE_EXIT && this._token.value) {
        try {
          const token = await getTokenV2(this._token.value);
          const signer = await getSigner();
          const account = signer.getAddress();
          const available = await getErc20Exit(token.address, account);
          this._maxAmount.textContent = ethers.utils.formatUnits(available, token.decimals).toString();
        } catch (e) {
          console.error(e);
        }
        return;
      }
    }

    if (type === TYPE_TOP_UP) {
      this._from.value = L2_STR;
      this._from.readOnly = true;

      this._to.value = OPERATOR_STR;
      this._to.readOnly = true;
    }

    if (type === TYPE_TRANSFER) {
      this._from.readOnly = false;
      this._to.readOnly = false;
      this._to.value = '';
      this._to.removeAttribute('list');
    }

    if ((type === TYPE_TRANSFER && this._from.value === L2_STR) || type === TYPE_WITHDRAW) {
      this._token.setAttribute('list', 'tokenboxlist');
    } else {
      this._token.setAttribute('list', 'tokenlistv2');
    }

    let available = '0';
    if (this._token.value && type !== TYPE_EXIT) {
      const signer = await getSigner();
      const account = await signer.getAddress();
      const token = await getTokenV2(this._token.value);
      let availableAmount = BigInt(0);
      if (this._from.value === L1_STR) {
        availableAmount = BigInt(await token.contract.balanceOf(account));
      } else {
        const { habitat } = await getProviders();
        availableAmount = BigInt(await habitat.callStatic.getUnlockedBalance(token.address, account));
      }
      available = ethers.utils.formatUnits(availableAmount, token.decimals);
    }
    this._maxAmount.textContent = available;
  }

  async onSign (evt) {
    const type = this._action.value;

    if (!type) {
      bananaFever();
      return;
    }

    const token = await getTokenV2(this._token.value);
    const amount = this.shadowRoot.querySelector('#amount').value;
    const feedback = this.shadowRoot.querySelector('#feedback');

    feedback.textContent = 'Pending...';

    try {
      if (type === TYPE_DEPOSIT) {
        await deposit({ token, amount });
      }

      if (type === TYPE_WITHDRAW) {
        await withdraw({ token, amount });
      }

      if (type === TYPE_TRANSFER) {
        const network = this._from.value;
        if (network !== L1_STR && network !== L2_STR) {
          throw new Error('unknown network');
        }

        const to = await resolveName(this._to.value);

        if (this._from.value === L1_STR) {
          await l1Transfer({ to, token, amount });
        } else {
          await l2Transfer({ to, token, amount });
        }
      }

      if (type === TYPE_EXIT) {
        await exit({ token, amount });
      }

      if (type === TYPE_TOP_UP) {
        await topUpGas({ token, amount });
      }

      feedback.textContent = '🙌 success';
    } catch (e) {
      feedback.textContent = ' ';
      throw e;
    }
  }

  doExit (token, amount) {
    this._action.value = TYPE_EXIT;
    this._token.value = token;
    this.onSelect();
    this.scrollIntoView();
  }

  async update () {
    if (!this.isConnected) {
      return;
    }

    onChainUpdate(this.update.bind(this));

    const signer = await getSigner();
    const account = await signer.getAddress();
    const tokens = await getTokensForAccount(account);
    const list = this.shadowRoot.querySelector('#tokenboxlist');
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
customElements.define('habitat-transfer-box', HabitatTransferBox);
