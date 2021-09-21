import {
  ethers,
  getTokenV2,
  getConfig,
} from './utils.js';
import {
  doQueryWithOptions,
  getProviders,
} from './rollup.js';
import { calculateLiquidityRewards } from './rewards.js';

const { HBT, HBT_LIQUIDITY_TOKEN } = getConfig();

async function queryEligibleAccounts () {
  const { habitat } = await getProviders();
  const logs = await doQueryWithOptions({ toBlock: 1 }, 'TokenTransfer', HBT_LIQUIDITY_TOKEN);
  const ret = [];
  const tmp = {};

  for (const log of logs) {
    const account = log.args.to;
    if (account === ethers.constants.AddressZero || tmp[account]) {
      continue;
    }
    tmp[account] = true;

    ret.push(account);
  }

  return ret;
}

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  color: var(--color-text);
  vertical-align: bottom;
  line-height: 1;
}
#wrapper {
  border-radius: 2em;
  background-color: var(--color-bg);
  max-width: max-content;
  padding: 1rem;
}
.content {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 1rem;
  align-items: center;
}
a {
  display: block;
  text-decoration: underline;
  margin: 1rem 0;
}
</style>
<div id='wrapper'></div>
`;

const LIST_HEADER = document.createElement('template');
LIST_HEADER.innerHTML = `
<span>Account</span>
<span>Reward</span>
`;

export default class HabitatLpList extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    this.render();
  }

  async render () {
    const epochData = {};
    const { rootProvider } = await getProviders();
    const transfers = await queryEligibleAccounts();
    const token = await getTokenV2(HBT_LIQUIDITY_TOKEN);
    for (const account of transfers) {
      const { rewards } = await calculateLiquidityRewards(token, account);
      for (const reward of rewards) {
        if (!reward.reward) {
          continue;
        }
        const epoch = reward.epoch;
        const ary = epochData[epoch] || [];
        epochData[epoch] = ary;
        ary.push(Object.assign({ account }, reward));
      }
    }

    const rewardToken = await getTokenV2(HBT);
    const wrapper = this.shadowRoot.querySelector('#wrapper');
    wrapper.replaceChildren();
    for (const epoch in epochData) {
      const data = epochData[epoch];
      const items = [];
      const content = document.createElement('div');
      content.className = 'content';
      content.append(LIST_HEADER.content.cloneNode(true));
      let csv = 'token,receiver,amountOrId\n';

      for (const { account, reward } of data) {
        const r = ethers.utils.formatUnits(reward, rewardToken.decimals);
        csv += `${rewardToken.address},${account},${r}\n`;
        let e = document.createElement('span');
        e.textContent = account;
        content.append(e);

        e = document.createElement('span');
        e.textContent = r;
        content.append(e);
      }

      const epochElement = document.createElement('h2');
      epochElement.textContent = `Epoch #${epoch}`;
      const exportButton = document.createElement('a');
      exportButton.download = `habitat-lp-rewards-epoch-${epoch}.csv`;
      exportButton.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      exportButton.textContent = 'Export as CSV';
      wrapper.append(epochElement, content, exportButton);
    }
  }
}
customElements.define('habitat-lp-list', HabitatLpList);
