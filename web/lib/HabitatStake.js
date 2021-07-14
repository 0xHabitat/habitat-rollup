import {
  walletIsConnected,
  getSigner,
  getTokenV2,
  renderAmount,
  ethers,
  wrapListener,
} from './utils.js';
import {
  getProviders,
  doQuery,
  getProposalInformation,
  getCommunityInformation,
  queryTransactionHashForProposal,
  fetchLatestVote,
  submitVote,
} from './rollup.js';

import { COMMON_STYLESHEET } from './component.js';
import './HabitatSlider.js';
import './HabitatCircle.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<div class='listitem'>
  <space></space>
  <div class='flex col evenly'>
    <p class='bold' id='title'> </p>
    <p class='' id='community'> </p>
    <space></space>
    <habitat-circle></habitat-circle>
    <space></space>
    <label>
      Tap or Drag the slider to adjust the stake
      <habitat-slider></habitat-slider>
    </label>
    <label>
      Or manually enter your desired stake
      <input type='number' min='0' style='min-width:auto;'>
    </label>
    <div class='flex'>
      <button id='vote' class='smaller purple'>Change</button>
      <a id='link' target='_blank' class='button secondary smaller'>View Proposal</a>
    </div>
  </div>
  <space></space>
</div>`;


const ATTR_PROPOSAL = 'x-proposal';
const ATTR_SHARES = 'x-shares';
const ATTR_SIGNAL = 'x-signal';

export default class HabitatStake extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_PROPOSAL, ATTR_SHARES];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
  }

  connectedCallback () {
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    return this.update();
  }

  async update () {
    const proposalId = this.getAttribute(ATTR_PROPOSAL);
    const txHash = await queryTransactionHashForProposal(proposalId);
    const signer = await getSigner();
    const account = await signer.getAddress();
    const { shares, signalStrength } = await fetchLatestVote(account, proposalId);
    const info = await getProposalInformation(txHash);
    const communityInfo = await getCommunityInformation(info.communityId);

    this.shadowRoot.querySelector('#title').textContent = info.title;
    this.shadowRoot.querySelector('#link').href = info.link;
    this.shadowRoot.querySelector('#community').textContent = communityInfo.title;

    const token = await getTokenV2(communityInfo.governanceToken);
    const units = ethers.utils.formatUnits(shares, token.decimals);
    const slider = this.shadowRoot.querySelector('habitat-slider');
    const input = this.shadowRoot.querySelector('input');
    const circle = this.shadowRoot.querySelector('habitat-circle');

    slider.setRange(0, units, units, units);
    slider.addEventListener('change', () => {
      circle.setValue(slider.percent, renderAmount(input.value), token.symbol);
      if (this.shadowRoot.activeElement !== input) {
        input.value = Number(slider.value).toFixed(2);
      }
    }, false);
    input.addEventListener('keyup', () => {
      console.log({units,x:input.value});
      slider.setRange(0, units, units, input.value);
    }, false);

    wrapListener(
      this.shadowRoot.querySelector('button'),
      async () => {
        const shares = input.value;
        await submitVote(info.communityId, proposalId, Number(shares) ? signalStrength : 0, shares);
        await this.update();
      }
    );
  }
}

customElements.define('habitat-stake', HabitatStake);
