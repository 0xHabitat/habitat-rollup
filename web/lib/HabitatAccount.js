import {
  getSigner,
  getErc20,
  wrapListener,
  renderAddress,
  renderAmount,
  walletIsConnected,
  getEtherscanTokenLink,
  getTokenName,
  getNetwork,
  getConfig,
  getAttributes,
  getToken,
  secondsToString,
  ethers
} from './utils.js';
import {
  doQuery,
  getProviders,
  getUsername,
  getExitStatus,
  getBlockExplorerLink,
  getGasTank,
  queryTransfers,
  doQueryCustom,
  sendTransaction,
  getTotalDelegatedAmountForToken,
} from './rollup.js';
import { UsernameFlow } from './flows.js';
import { calculateRewards } from './rewards.js';
import TYPED_DATA from './typedData.js';

import HabitatPanel from './HabitatPanel.js';
import './HabitatTransferBox.js';
import './HabitatSlider.js';
import './HabitatCircle.js';
import './HabitatStakes.js';
import './HabitatRewards.js';
import './HabitatDelegationView.js';

const { HBT, DEFAULT_ROLLUP_OPERATOR_ADDRESS } = getConfig();
let walletContainer;
let tokenContract;
let account;

const ACCOUNT_ERC20_PRE_TEMPLATE =
`
<p>Token</p>
<p>Amount</p>
<p>Staked</p>
<p>Delegated</p>
`;

const ACCOUNT_ERC20_TEMPLATE =
`
<a target='_blank'></a>
<p></p>
<p></p>
<p></p>
`;

const ACCOUNT_EXITS_PRE_TEMPLATE =
`
<p>Token</p>
<p>Pending</p>
<p>Available</p>
`;

const ACCOUNT_EXITS_TEMPLATE =
`
<a target='_blank'></a>
<p></p>
<p></p>
`;

const ACCOUNT_TRANSFER_TEMPLATE =
`
<a target='_blank'></a>
<p></p>
<a target='_blank'></a>
`;

const ACCOUNT_TEMPLATE =
`
<style>
#erc20 > div, #history > div, #exits > div {
  margin: 0 auto;
  font-family: var(--font-family-mono);
  min-width: fit-content;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(5, auto);
  place-content: left;
}
#erc20 > div {
  grid-template-columns: repeat(4, auto);
}
#history > div {
  grid-template-columns: repeat(3, auto);
}
#exits > div {
  grid-template-columns: repeat(3, auto);
}
.tabs {
  margin: 2em;
  gap: 4em;
}
.tabs a {
  font-size: 1.5em;
  color: var(--color-black);
}
.tabs > div {
  background: none;
  border-bottom: 1px solid transparent;
}
.tabs > div.active {
  border-bottom-color: var(--color-bg-invert);
}
#tokenActions > button {
  visibility: hidden;
  opacity: 0;
  border: none;
}
#tokenActions > button.expanded {
  visibility: visible;
  opacity: 1;
}
</style>
<section style='background-color:var(--color-bg-yellow);min-height:100%;'>
<div class='flex row' style='justify-content:space-between;width:100%;min-height:4em;'>
  <div class='left' style='margin-left:1em;width:42ch;max-width:100%;'>
    <label>Loading...<habitat-slider id='progress'></habitat-slider></label>
  </div>

  <div class='flex row'>
    <h6 id='greeting'> </h6>
    <button id='name' class='flow smaller'>Change Username</button>
  </div>
</div>
<sep></sep>
<section>
  <div class='flex row tabs left'>
    <div class='active'>
      <a target='#wallet-overview' class='bold secondary'>Balance</a>
    </div>
    <div>
      <a target='#wallet-stakes' class='bold secondary'>Proposals</a>
    </div>
    <div>
      <a target='#wallet-delegation' class='bold secondary'>Delegation</a>
    </div>
    <div>
      <a target='#wallet-rewards' class='bold secondary'>Rewards</a>
    </div>
  </div>
</section>

<space></space>

<style>
.tabcontainer {
  width: max-content;
  overflow: hidden;
  display: flex;
  flex-wrap: nowrap;
  transition: .5s all ease-in;
}

.tabcontainer > section {
  width: var(--section-width-panel);
}
#wallet-overview-inner {
  display: grid;
  gap: 0;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: auto;
}
@media (max-width: 1000px) {
  .box {
    max-width: max-content;
  }
  #wallet-overview-inner {
    grid-template-columns: auto;
  }
  #wallet-overview-inner > .box {
    grid-column: auto !important;
    grid-row: auto !important;
  }
}
</style>
<section class='tabcontainer'>
  <section class='tab' id='wallet-overview'>
    <div class='flex col'>

    <div style='place-self:flex-end;' class='flex'>
      <button id='add747' class='smaller noHover'>Add HBT to <img style='display:inline;height:1em' src='/lib/assets/icons/metamask-fox.svg'></button>
    </div>

      <div id='wallet-overview-inner'>
        <div class='box' style='grid-row:1/4;grid-column:1/2;padding:0;max-width:max-content;'>
          <habitat-transfer-box></habitat-transfer-box>
        </div>

        <div class='left box' style='grid-row:1/1;grid-column:2/2;'>
          <h6>⛽️ Gas Tank Balance</h6>
          <space></space>
          <div style='display:grid;grid-template-rows:1fr 1fr;'>
            <div>
              <h1 id='gasTankBalance'> </h1>
              <p class='smaller' style='color:var(--color-grey);'>For roundabout <span id='gasTankRemaining'></span> Transactions.</p>
            </div>
            <div style='place-self:end left;'>
              <p class='smaller' style='color:var(--color-grey);'>⚠️ You can't remove balance from gas tank.</p>
            </div>
          </div>
        </div>

        <div class='left box' style='grid-row:1/1;grid-column:3/3;'>
          <h6>💸 Yield</h6>
          <space></space>
          <div style='display:grid;grid-template-columns:repeat(2, auto);gap:.5em;'>
            <div>
              <h1 style='' id='rewardYield'> </h1>
              <space></space>
              <button id='claim' class='boxBtn'>Claim</button>
            </div>
            <div>
              <p class='smaller' style='color:var(--color-grey);'>Rewards earned based on deposited HBT amount and Rollup activity.</p>
              <space></space>
              <p class='smaller' style='color:var(--color-grey);'>Next yield added in <span id='nextYield'></span></p>
            </div>
          </div>
        </div>

        <div class='left box' style='grid-row:2/4;grid-column:2/4;'>
          <h6>🏕 Rollup Balances</h6>
          <space></space>
          <div id='erc20'></div>
        </div>

        <div class='left box' style='grid-row:4/8;grid-column:2/4;'>
          <h6>💫 Activities</h6>
          <space></space>
          <div id='history'></div>
        </div>

        <div id='tokenActions' class='flex row' style='visibility:hidden'>
          <button id='transfer' class='flow'></button>
          <button id='withdraw' class='flow'></button>
        </div>

        <div class='box left' style='grid-row:4;grid-column:1/1;'>
          <h6>✈️ Withdrawals</h6>
          <space></space>
          <div id='exits'></div>
          <space></space>
        </div>
      </div>
    </div>
  </section>

  <section class='tab' id='wallet-stakes'>
    <habitat-stakes></habitat-stakes>
  </section>

  <section class='tab' id='wallet-delegation'>
    <habitat-delegation-view></habitat-delegation-view>
  </section>

  <section class='tab' id='wallet-rewards'>
    <habitat-rewards></habitat-rewards>
  </section>

</section>
`;

async function updateErc20 () {
  // xxx
  const slider = document.querySelector('habitat-slider#progress');
  const { habitat, bridge } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const { tokens, transfers } = await queryTransfers(account);

  {
    // testnet
    if (habitat.provider._network && habitat.provider._network !== 1) {
      if (tokens.indexOf(HBT) === -1) {
        tokens.push(HBT);
      }
    }
  }

  document.querySelector('#tokenActions').style.visibility = tokens.length ? 'visible' : 'hidden';

  if (!tokens.length) {
    slider.parentElement.style.display = 'none';
    return;
  }
  slider.parentElement.style.display = 'revert';

  const maxSliderLen = (tokens.length * 2) + transfers.length;
  let sliderV = 0;
  function updateSlider () {
    sliderV++;
    slider.setRange(sliderV, sliderV, maxSliderLen);
  }

  {
    // render balances
    const child = document.createElement('div');
    child.innerHTML = ACCOUNT_ERC20_PRE_TEMPLATE + ACCOUNT_ERC20_TEMPLATE.repeat(tokens.length);
    const children = child.children;
    let childPtr = 4;
    for (let i = 0, len = tokens.length; i < len; i++) {
      updateSlider();
      const token = tokens[i];
      const erc = await getErc20(token);
      const balance = await habitat.callStatic.getBalance(token, account);
      const tokenName = await getTokenName(token);
      const stakedBalance = await habitat.callStatic.getActiveVotingStake(token, account);
      const delegatedBalance = await getTotalDelegatedAmountForToken(token, account);
      children[childPtr].textContent = tokenName;
      children[childPtr++].href = getEtherscanTokenLink(token, account);
      children[childPtr++].textContent = renderAmount(balance, erc._decimals);
      children[childPtr++].textContent = renderAmount(stakedBalance, erc._decimals);
      children[childPtr++].textContent = renderAmount(delegatedBalance, erc._decimals);
    }
    const container = document.querySelector('#erc20');
    if (container) {
      container.replaceChildren(child);
    }
  }

  {
    // exits
    const child = document.createElement('div');
    child.innerHTML = ACCOUNT_EXITS_PRE_TEMPLATE + ACCOUNT_EXITS_TEMPLATE.repeat(tokens.length);
    const children = child.children;
    let childPtr = 3;
    for (let i = 0, len = tokens.length; i < len; i++) {
      updateSlider();
      const token = tokens[i];
      const { pendingAmount, availableAmount } = await getExitStatus(token, account);

      const erc = await getErc20(token);
      const amount = ethers.utils.formatUnits(availableAmount, erc._decimals);
      const disabled = !availableAmount.gt(0);

      children[childPtr].textContent = await getTokenName(token);
      children[childPtr++].href = getEtherscanTokenLink(token, account);
      children[childPtr++].textContent = renderAmount(pendingAmount, erc._decimals);
      children[childPtr++].textContent = renderAmount(availableAmount, erc._decimals);
      //wrapListener(children[childPtr++], (evt) => document.querySelector('habitat-transfer-box').doExit(token, amount));
    }
    const container = document.querySelector('#exits');
    if (container) {
      container.replaceChildren(child);
    }
  }

  if (transfers.length) {
    // transfer history
    const child = document.createElement('div');
    child.innerHTML = '<p></p><p>Amount</p><p>Transaction Type</p>' + ACCOUNT_TRANSFER_TEMPLATE.repeat(transfers.length);
    const children = child.children;
    let childPtr = 3;
    for (let i = 0, len = transfers.length; i < len; i++) {
      updateSlider();
      const { token, from, to, value, transactionHash } = transfers[(len - 1) - i];
      const isDeposit = from === ethers.constants.AddressZero;
      const isIncoming = to === account;
      const isExit = to === ethers.constants.AddressZero;
      const isTopUp = to.toLowerCase() === DEFAULT_ROLLUP_OPERATOR_ADDRESS;
      const erc = await getErc20(token);
      const amount = renderAmount(value, erc._decimals);
      let type = '';

      if (isDeposit) {
        type = 'Deposit';
      } else if (isExit) {
        type = 'Exit';
      } else if (isIncoming) {
        type = Number(from) < 0xffffffff ? 'Operator Reward' : 'Incoming';
      } else if (isTopUp) {
        type = 'Gas Tank Top-up';
      } else {
        type = Number(to) < 0xffffffff ? 'Top-up Fee' : 'Outgoing';
      }

      // token
      children[childPtr].textContent = await getTokenName(token);
      children[childPtr++].href = getEtherscanTokenLink(token, account);
      // amount
      children[childPtr++].textContent = amount;

      // type
      children[childPtr].href = getBlockExplorerLink(transactionHash);
      children[childPtr++].textContent = type;

      // from
      //children[childPtr++].textContent = await getUsername(from);
      // to
      //children[childPtr++].textContent = await getUsername(to);
      // block explorer link
      //children[childPtr].textContent = renderAddress(transactionHash);
      //children[childPtr++].href = getBlockExplorerLink(transactionHash);
    }
    const container = document.querySelector('#history');
    if (container) {
      container.replaceChildren(child);
    }
  }

  slider.parentElement.style.display = 'none';
}

function onTab (evt) {
  const ACTIVE = 'active';
  const target = evt.target.getAttribute('target');
  const targetSection = document.querySelector(target);
  const parentContainer = targetSection.parentElement;

  evt.target.parentElement.parentElement.querySelector('.active').classList.remove(ACTIVE);
  evt.target.parentElement.classList.add(ACTIVE);

  for (let i = 0, len = parentContainer.children.length; i < len; i++) {
    const section = parentContainer.children[i];
    if (section === targetSection) {
      const foo = window.getComputedStyle(section).getPropertyValue('--section-width-panel');
      parentContainer.style.transform = `translateX( calc( ${foo} * -${1 * i}) )`;
      break;
    }
  }
}

class HabitatAccount extends HabitatPanel {
  static TEMPLATE = ACCOUNT_TEMPLATE;

  constructor() {
    super();
  }

  get title () {
    return 'Account Overview';
  }

  async render () {
    for (const e of this.querySelectorAll('.tabs div > a')) {
      wrapListener(e, onTab);
    }

    wrapListener(this.querySelector('button#name'), (evt) => new UsernameFlow(evt.target));
    wrapListener(
      this.querySelector('#add747'),
      async () => {
        // EIP-747
        const signer = await getSigner();
        await signer.provider.send(
          'metamask_watchAsset',
          {
            type: 'ERC20',
            options: {
              address: HBT,
              symbol: 'HBT',
              decimals: 10,
              image: `${window.location.origin}/lib/assets/logo.png`,
            }
          }
        );
      }
    );

    this.updateAccount();
  }

  async chainUpdateCallback () {
    await this.updateAccount();
  }

  async updateAccount () {
    if (!this.isConnected) {
      return;
    }

    const { habitat } = await getProviders();
    const signer = await getSigner();
    const account = await signer.getAddress();
    const user = await getUsername(account, true);
    this.querySelector('#greeting').textContent = user;

    const token = await getToken(HBT);
    {
      const { value, remainingEstimate } = await getGasTank(account);
      this.querySelector('#gasTankRemaining').textContent = remainingEstimate.toString();
      this.querySelector('#gasTankBalance').textContent = `${renderAmount(value, token._decimals)} HBT`;
    }

    await updateErc20();

    // rewards
    {
      const { claimable, sinceEpoch, secondsUntilNextEpoch } = await calculateRewards(token);
      this.querySelector('#rewardYield').textContent = `${renderAmount(claimable, token._decimals)} HBT`;
      this.querySelector('#nextYield').textContent = secondsToString(secondsUntilNextEpoch);
      const claimBtn = this.querySelector('#claim');
      wrapListener(claimBtn, () => sendTransaction('ClaimStakingReward', { sinceEpoch, token: token.address }));
      claimBtn.disabled = !claimable;
    }
  }
}
customElements.define('habitat-account', HabitatAccount);
