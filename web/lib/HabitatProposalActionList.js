import {
  ethers,
  getTokenV2,
  getEtherscanLink,
} from './utils.js';
import {
  getProviders,
  decodeExternalProposalActions,
  decodeInternalProposalActions,
  encodeExternalProposalActions,
  encodeInternalProposalActions,
  resolveName,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const ACTION_TEMPLATE = document.createElement('template');
ACTION_TEMPLATE.innerHTML = `
<div class='actionTemplate actionTemplateItem'>
<a target='_blank'></a>
<a target='_blank'></a>
<a target='_blank'></a>
<span id='remove' class='lbl' style='cursor:pointer;align-self:center;'> 🗑 </span>
</div>
`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.lbl {
  color: var(--color-grey);
  font-weight: ligther;
}
.actionTemplate {
  display: grid;
  grid-template-columns: 10em auto 10em 1em;
  gap: 1em;
  width: 100%;
  margin: .3em 0;
  padding: .5em 1em;
}
.actionTemplateItem {
  border-radius: 2em;
  border: 1px solid var(--color-bg-invert);
}
.actionTemplate > * {
  white-space: pre-line;
  word-break: break-all;
  color: var(--color-text);
}
</style>
<div id='actions' class='flex col align-left'>
  <div class='actionTemplate'>
    <span class='bold'>Type</span>
    <span class='bold'>Destination</span>
    <span class='bold'>Amount / Input</span>
    <span class='bold'></span>
  </div>
</div>
`;

const TYPE_MAINNET = 'Mainnet Execution';
const TYPE_TRANSFER = 'Token Transfer';

export default class HabitatProposalActionList extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
  }

  async handleEvent (evt) {
    const obj = evt.detail;
    const actions = this.shadowRoot.querySelector('#actions');
    const template = ACTION_TEMPLATE.content.cloneNode(true);
    const div = template.children[0];
    div.querySelector('#remove').addEventListener('click', (evt) => {
      div.remove();
    }, { once: true });

    const childs = div.children;
    childs[0].textContent = obj.type;

    if (obj.type === TYPE_MAINNET) {
      const addr = await resolveName(obj.to);
      childs[1].textContent = addr;
      childs[1].href = getEtherscanLink(addr);
      childs[2].textContent = obj.calldata;

      actions.append(template);
      return;
    }

    if (obj.type === TYPE_TRANSFER) {
      const token = await getTokenV2(obj.token);
      const addr = await resolveName(obj.to);
      childs[1].textContent = addr;
      childs[1].href = getEtherscanLink(addr);
      childs[2].textContent = `${obj.amount} ${token.symbol}`;
      childs[2].href = getEtherscanLink(token.address);
      childs[2].setAttribute('addr', token.address);
      childs[2].setAttribute('amt', obj.amount);

      actions.append(template);
      return;
    }
  }

  async decode ({ internalActions, externalActions }) {
    const actions = this.shadowRoot.querySelector('#actions');
    for (const node of actions.querySelectorAll('.actionTemplateItem')) {
      node.remove();
    }
    const decodedInternal = decodeInternalProposalActions(internalActions);
    for (const action of decodedInternal) {
      const template = ACTION_TEMPLATE.content.cloneNode(true);
      const div = template.children[0];
      const childs = div.children;
      const token = await getTokenV2(action.token);
      const amount = ethers.utils.formatUnits(action.value, token.decimals);
      childs[0].textContent = action.type;
      childs[1].textContent = action.receiver;
      childs[1].href = getEtherscanLink(action.receiver);
      childs[2].textContent = `${amount} ${token.symbol}`;
      childs[2].href = getEtherscanLink(token.address);
      childs[2].setAttribute('addr', token.address);
      childs[2].setAttribute('amt', amount);
      // clear
      childs[3].textContent = '';
      actions.append(template);
    }

    const decodedExternal = decodeExternalProposalActions(externalActions);
    for (let i = 0, len = decodedExternal.length; i < len;) {
      const to = decodedExternal[i++];
      const calldata = decodedExternal[i++];
      const template = ACTION_TEMPLATE.content.cloneNode(true);
      const div = template.children[0];
      const childs = div.children;
      childs[0].textContent = TYPE_MAINNET;
      childs[1].textContent = to;
      childs[1].href = getEtherscanLink(to);
      childs[2].textContent = calldata;
      // clear
      childs[3].textContent = '';
      actions.append(template);
    }
  }

  async encode () {
    function checkAddress (addr) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`${addr} is not a valid address`);
      }
    }

    const internalActions = [];
    const externalActions = [];

    for (const node of this.shadowRoot.querySelectorAll('.actionTemplateItem')) {
      const childs = node.children;
      const type = childs[0].textContent;

      if (type === TYPE_MAINNET) {
        const addr = childs[1].textContent;
        const calldata = childs[2].textContent;
        if (!ethers.utils.isBytesLike(calldata)) {
          throw new Error(`${calldata} is not a valid hex-string`);
        }

        checkAddress(addr);
        externalActions.push(addr);
        externalActions.push(calldata);
        continue;
      }

      if (type === TYPE_TRANSFER) {
        const to = childs[1].textContent;
        const token = await getTokenV2(childs[2].getAttribute('addr'));
        const value = ethers.utils.parseUnits(childs[2].getAttribute('amt'), token.decimals).toHexString();

        checkAddress(to);
        internalActions.push('0x1');
        internalActions.push(token.address);
        internalActions.push(to);
        internalActions.push(value);
        continue;
      }
    }

    return {
      internalActions: encodeInternalProposalActions(internalActions),
      externalActions: encodeExternalProposalActions(externalActions),
    };
  }
}
customElements.define('habitat-proposal-action-list', HabitatProposalActionList);
