import {
  walletIsConnected,
  getSigner,
  wrapListener,
} from './utils.js';
import {
  getProviders,
  doQuery,
  onChainUpdate,
  getStakedProposals,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';
import './HabitatStake.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<div>
  <space></space>
  <div class='flex row' style='place-content:flex-end;'>
    <button id='freeVotes' class='s'>Remove all Votes</button>
  </div>
  <div class='flex row evenly'>
    <p class='bold' id='info'></p>
  </div>
  <div id='stakes' class='flex evenly center'></div>
  <space></space>
</div>`;

export default class HabitatStakes extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    this._container = this.shadowRoot.querySelector('#stakes');
    wrapListener(this.shadowRoot.querySelector('#freeVotes'), async () => {
      const txs = await getStakedProposals();
      // dispatch (to sidebar)
      window.postMessage({ type: 'hbt-tx-bundle', value: txs }, window.location.origin);
    });
  }

  connectedCallback () {
    onChainUpdate(this.onChainUpdateCallback.bind(this));
    this.update();
  }

  onChainUpdateCallback () {
    if (this.isConnected) {
      onChainUpdate(this.onChainUpdateCallback.bind(this));
      this.update();
    }
  }

  async update () {
    if (!this.isConnected) {
      return;
    }

    if (!walletIsConnected) {
      return;
    }

    const signer = await getSigner();
    const account = await signer.getAddress();
    const { habitat } = await getProviders();
    const tmp = {};
    for (const log of await doQuery('VotedOnProposal', account)) {
      const { proposalId, signalStrength, shares } = log.args;
      tmp[proposalId] = { shares, signalStrength };
    }

    for (const proposalId in tmp) {
      const { shares, signalStrength } = tmp[proposalId];
      const attr = `[x-proposal="${proposalId}"]`;
      if (shares.eq(0)) {
        const e = this._container.querySelector(attr);
        if (e) {
          e.remove();
        }
        // ignore
        continue;
      }

      if (this._container.querySelector(attr)) {
        continue;
      }

      const ele = document.createElement('habitat-stake');
      ele.setAttribute('x-proposal', proposalId);
      ele.setAttribute('x-shares', shares.toString());
      ele.setAttribute('x-signal', signalStrength.toString());
      this._container.appendChild(ele);
    }

    this.shadowRoot.querySelector('#info').textContent =
      this._container.children.length === 0 ? 'You staked on no proposals yet.' : '';
  }
}

customElements.define('habitat-stakes', HabitatStakes);
