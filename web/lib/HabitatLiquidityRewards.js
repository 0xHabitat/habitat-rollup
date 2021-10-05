import { COMMON_STYLESHEET } from './component.js';
import {
  getTokenV2,
  renderAmount,
  secondsToString,
  getConfig,
  getSigner,
} from './utils.js';
import {
  getProviders,
  onChainUpdate,
} from './rollup.js';
import { calculateLiquidityRewards } from './rewards.js';

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
      <div style='display:grid;grid-template-columns:1fr;gap:.5em;'>
        <div>
          <h1 id='currentEpoch'> </h1>
        </div>
      </div>
    </div>

    <div class='center box'>
      <h6><emoji-full-moon></emoji-full-moon><span> Accrued</span></h6>
      <space></space>
      <h1 id='accrued'> </h1>
      <div>
        <p><span id='currentStake'> </span><span> Staked</span></p>
        <p><span id='currentShare'> </span><span> % Share of TVL</span></p>
      </div>
    </div>

  </div>
  <space></space>
  <div class='center box'>
    <div id='epochs'></div>
  </div>
  <space></space>
</div>`;

export default class HabitatLiquidityRewards extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
  }

  connectedCallback () {
    this.update();
  }

  async update () {
    if (!this.isConnected) {
      return;
    }
    onChainUpdate(this.update.bind(this));

    const { HBT, HBT_LIQUIDITY_TOKEN } = getConfig();
    const { habitat } = await getProviders();
    const token = await getTokenV2(HBT_LIQUIDITY_TOKEN);
    const rewardToken = await getTokenV2(HBT);
    const signer = await getSigner();
    const account = await signer.getAddress();
    const {
      currentEpoch,
      currentStake,
      currentPoolShare,
      poolShareDivider,
      rewards,
    } = await calculateLiquidityRewards(token, account);

    this.shadowRoot.querySelector('#currentEpoch').textContent = currentEpoch.toString();
    this.shadowRoot.querySelector('#currentStake').textContent = `${renderAmount(currentStake, token.decimals, 10)} ${token.symbol}`;
    this.shadowRoot.querySelector('#currentShare').textContent = ((Number(currentPoolShare) / Number(poolShareDivider)) * 100).toFixed(4);

    const grid = this.shadowRoot.querySelector('#epochs');
    grid.innerHTML = EPOCH_PRE_TEMPLATE + EPOCH_TEMPLATE.repeat(rewards.length);
    let childPtr = 3;
    const children = grid.children;
    let accrued = BigInt(0);
    for (const { epoch, reward, timestamp } of rewards) {
      children[childPtr++].textContent = epoch.toString();
      children[childPtr++].textContent = `${renderAmount(reward, rewardToken.decimals)} ${rewardToken.symbol}`;
      children[childPtr++].textContent = secondsToString(timestamp);
      accrued += reward;
    }
    this.shadowRoot.querySelector('#accrued').textContent = `${renderAmount(accrued, rewardToken.decimals)} ${rewardToken.symbol}`;
  }
}
customElements.define('habitat-liquidity-rewards', HabitatLiquidityRewards);
