import { COMMON_STYLESHEET } from './component.js';
import {
  walletIsConnected,
  getSigner,
  getTokenV2,
  renderAmount,
  wrapListener,
  secondsToString,
  getConfig
} from './utils.js';
import {
  onChainUpdate,
  sendTransaction
} from './rollup.js';
import { calculateRewards } from './rewards.js';

const EPOCH_PRE_TEMPLATE = '<p>Epoch #</p><p>Reward</p><p>Epoch ends in</p>';
const EPOCH_TEMPLATE = '<p></p><p></p><p></p>';
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
#epochs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .5em;
}
#top > .box {
  margin: .5em 1em;
}
</style>
<div>
  <space></space>
  <div id='top' class='flex row evenly'>

    <div class='center box'>
      <h6><emoji-hourglass-not-done></emoji-hourglass-not-done><span> Current Epoch</span></h6>
      <space></space>
      <div style='display:grid;grid-template-columns:1fr 1fr;gap:.5em;'>
        <div>
          <h1 id='currentEpoch'> </h1>
          <p id='time' class='smaller'> </p>
        </div>
        <div>
          <h1 id='currentPoolBalance'> </h1>
          <p class='smaller'>Currently in Reward Pool</p>
        </div>
      </div>
    </div>

    <div class='center box'>
      <h6><emoji-full-moon></emoji-full-moon><span> Claimable</span></h6>
      <space></space>
      <h1 id='claimable'> </h1>
      <space></space>
      <button id='claim' class='noShadow boxBtn'>Claim</button>
    </div>

    <div class='center box'>
      <h6><emoji-first-quarter-moon></emoji-first-quarter-moon><span> Outstanding</span></h6>
      <space></space>
      <h1 id='outstanding'> </h1>
    </div>

  </div>
  <space></space>
  <div class='center box'>
    <div id='epochs'></div>
  </div>
  <space></space>
</div>`;

export default class HabitatRewards extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    wrapListener(this.shadowRoot.querySelector('#claim'), this.claim.bind(this));
  }

  connectedCallback () {
    this.update();
  }

  async claim () {
    await sendTransaction('ClaimStakingReward', this._claimArgs);
  }

  async update () {
    if (!this.isConnected) {
      return;
    }
    onChainUpdate(this.update.bind(this));

    const { HBT } = getConfig();
    const token = await getTokenV2(HBT);
    const {
      claimable,
      outstanding,
      currentEpoch,
      currentPoolBalance,
      sinceEpoch,
      secondsUntilNextEpoch,
      rewards,
      poolBalance,
    } = await calculateRewards(token);

    {
      this.shadowRoot.querySelector('#currentEpoch').textContent = currentEpoch.toString();
      this.shadowRoot.querySelector('#currentPoolBalance').textContent = `${renderAmount(currentPoolBalance, token.decimals)} ${token.symbol}`;
    }

    this.shadowRoot.querySelector('#claim').disabled = !claimable;
    this.shadowRoot.querySelector('#claimable').textContent = `${renderAmount(claimable, token.decimals)} ${token.symbol}`;
    this.shadowRoot.querySelector('#outstanding').textContent = `${renderAmount(outstanding, token.decimals)} ${token.symbol}`;
    this._claimArgs = {
      token: token.address,
      sinceEpoch: sinceEpoch
    };

    const grid = this.shadowRoot.querySelector('#epochs');
    grid.innerHTML = EPOCH_PRE_TEMPLATE + EPOCH_TEMPLATE.repeat(rewards.length);
    let childPtr = 3;
    const children = grid.children;
    for (const { epoch, reward, timestamp } of rewards) {
      children[childPtr++].textContent = epoch.toString();
      children[childPtr++].textContent = `${renderAmount(reward, token.decimals)} ${token.symbol}`;
      children[childPtr++].textContent = secondsToString(timestamp);
    }
  }
}
customElements.define('habitat-rewards', HabitatRewards);
