import {
  walletIsConnected,
  getSigner,
  getToken,
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
const TEMPLATE =
`
<style>
#epochs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .5em;
}
</style>
<div>
  <space></space>
  <div class='flex row evenly'>

    <div class='center box' style='grid-row:1/1;grid-column:2/2;'>
      <h6>⏳ Current Epoch</h6>
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

    <div class='center box' style='grid-row:1/1;grid-column:2/2;'>
      <h6>🌕 Claimable</h6>
      <space></space>
      <h1 id='claimable'> </h1>
      <space></space>
      <button id='claim' class='noHover noShadow boxBtn'>Claim</button>
    </div>

    <div class='center box' style='grid-row:1/1;grid-column:2/2;'>
      <h6>🌓 Outstanding</h6>
      <space></space>
      <h1 id='outstanding'> </h1>
    </div>

  </div>
  <div class='center box'>
    <div id='epochs'></div>
  </div>
  <space></space>
</div>`;

export default class HabitatRewards extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
      this._container = document.querySelector('#stakes');
      wrapListener(this.querySelector('#claim'), this.claim.bind(this));

      this.update();
    }
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
    const token = await getToken(HBT);
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
      this.querySelector('#currentEpoch').textContent = currentEpoch.toString();
      this.querySelector('#currentPoolBalance').textContent = `${renderAmount(currentPoolBalance, token._decimals)} ${token._symbol}`;
    }

    this.querySelector('#claim').disabled = !claimable;
    this.querySelector('#claimable').textContent = `${renderAmount(claimable, token._decimals)} ${token._symbol}`;
    this.querySelector('#outstanding').textContent = `${renderAmount(outstanding, token._decimals)} ${token._symbol}`;
    this._claimArgs = {
      token: token.address,
      sinceEpoch: sinceEpoch
    };

    const grid = this.querySelector('#epochs');
    grid.innerHTML = EPOCH_PRE_TEMPLATE + EPOCH_TEMPLATE.repeat(rewards.length);
    let childPtr = 3;
    const children = grid.children;
    for (const { epoch, reward, timestamp } of rewards) {
      children[childPtr++].textContent = epoch.toString();
      children[childPtr++].textContent = `${renderAmount(reward, token._decimals)} ${token._symbol}`;
      children[childPtr++].textContent = secondsToString(timestamp);
    }
  }
}

customElements.define('habitat-rewards', HabitatRewards);
