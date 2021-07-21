import {
  getSigner,
  wrapListener,
  renderAddress,
  renderAmount,
  walletIsConnected,
  getEtherscanTokenLink,
  getTokenName,
  getNetwork,
  getConfig,
  getAttributes,
  getTokenV2,
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
import './HabitatTokenElement.js';

const { HBT, DEFAULT_ROLLUP_OPERATOR_ADDRESS } = getConfig();
let walletContainer;
let tokenContract;
let account;

const ACCOUNT_ERC20_PRE_TEMPLATE =
`
<p>Token</p>
<p>Total</p>
<p>Available</p>
<p>Voted</p>
<p>Delegated</p>
`;

const ACCOUNT_ERC20_TEMPLATE =
`
<habitat-token-element></habitat-token-element>
<p></p>
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
<habitat-token-element></habitat-token-element>
<p></p>
<p></p>
`;

const ACCOUNT_TRANSFER_TEMPLATE =
`
<habitat-token-element></habitat-token-element>
<p></p>
<a target='_blank'></a>
`;

const SVG_INFO_ICON =
`
<svg class="info-svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9584 4.25H12.0416C13.4108 4.24999 14.4957 4.24999 15.3621 4.33812C16.2497 4.42841 16.9907 4.61739 17.639 5.05052C18.1576 5.39707 18.6029 5.84239 18.9495 6.36104C19.3826 7.00926 19.5716 7.7503 19.6619 8.63794C19.75 9.5043 19.75 10.5892 19.75 11.9584V12.0416C19.75 13.4108 19.75 14.4957 19.6619 15.3621C19.5716 16.2497 19.3826 16.9907 18.9495 17.639C18.6029 18.1576 18.1576 18.6029 17.639 18.9495C16.9907 19.3826 16.2497 19.5716 15.3621 19.6619C14.4957 19.75 13.4108 19.75 12.0416 19.75H11.9584C10.5892 19.75 9.5043 19.75 8.63794 19.6619C7.7503 19.5716 7.00926 19.3826 6.36104 18.9495C5.84239 18.6029 5.39707 18.1576 5.05052 17.639C4.61739 16.9907 4.42841 16.2497 4.33812 15.3621C4.24999 14.4957 4.24999 13.4108 4.25 12.0416V11.9584C4.24999 10.5892 4.24999 9.5043 4.33812 8.63794C4.42841 7.7503 4.61739 7.00926 5.05052 6.36104C5.39707 5.84239 5.84239 5.39707 6.36104 5.05052C7.00926 4.61739 7.7503 4.42841 8.63794 4.33812C9.5043 4.24999 10.5892 4.24999 11.9584 4.25ZM11.1464 8.14645C11 8.29289 11 8.5286 11 9C11 9.4714 11 9.70711 11.1464 9.85355C11.2929 10 11.5286 10 12 10C12.4714 10 12.7071 10 12.8536 9.85355C13 9.70711 13 9.4714 13 9C13 8.5286 13 8.29289 12.8536 8.14645C12.7071 8 12.4714 8 12 8C11.5286 8 11.2929 8 11.1464 8.14645ZM11.1464 11.1464C11 11.2929 11 11.5286 11 12V15C11 15.4714 11 15.7071 11.1464 15.8536C11.2929 16 11.5286 16 12 16C12.4714 16 12.7071 16 12.8536 15.8536C13 15.7071 13 15.4714 13 15V12C13 11.5286 13 11.2929 12.8536 11.1464C12.7071 11 12.4714 11 12 11C11.5286 11 11.2929 11 11.1464 11.1464Z" fill="black"/>
</svg>
`;

const ACCOUNT_GAS_TANK_CARD_TEMPLATE =
`
<div class='flip-card' style='grid-row:1/1;grid-column:2/2;'>
  <div id='wrapper-gas' class='flip-wrapper'>
    <div class='left box flip-card-front'>
      <h6 class='spaced-title'><span><emoji-fuelpump></emoji-fuelpump><span> Gas Tank Balance</span></span><em target='wrapper-gas' class='icon-info'>${SVG_INFO_ICON}</em></h6>
      <space></space>
      <div style='display:grid;grid-template-rows:1fr 1fr;'>
        <div>
          <h1 id='gasTankBalance'> </h1>
          <p class='smaller' style='color:var(--color-grey);'>Estimated price per Transaction: <span id='ratePerTx'></span></p>
          <p class='smaller' style='color:var(--color-grey);'>For roundabout <span id='gasTankRemaining'></span> Transactions.</p>
        </div>
        <div style='place-self:end left;'>
          <p class='smaller' style='color:var(--color-grey);'><span><emoji-warning></emoji-warning><span>You can't remove balance from gas tank.</span></span></p>
        </div>
      </div>
    </div>
    <div class='left box flip-card-back'>
      <h6 class='right-title'><em target='wrapper-gas' class='icon-info icon-flip'>${SVG_INFO_ICON}</em></h6>
      <p class='info-text'>To secure the network and all the user and community funds the Habitat rollup needs Gas to operate.</p>
      <p class='info-text'>Like a pre-paid phone the user tops up it's balance to interact with all features, modules and functionalities.</p>
      <p class='info-text'>A 1% top-up fee is taken and distributed among all HBT stakers/deposits.</p>
    </div>
  </div>
</div>
`;

const ACCOUNT_YIELD_CARD_TEMPLATE =
`
<div class='flip-card' style='grid-row:1/1;grid-column:3/3;'>
  <div id='wrapper-yield' class='flip-wrapper'>
    <div class='left box flip-card-front'>
      <h6 class='spaced-title'><span><emoji-cash></emoji-cash><span> Rollup Yield </span></span><em target='wrapper-yield' class='icon-info'>${SVG_INFO_ICON}</em></h6>
      <space></space>
      <div style='display:grid;grid-template-columns:repeat(2, 1fr);gap:.7em;'>
        <div>
          <div class='flex row' style='flex-wrap:nowrap;'>
            <h1 style='white-space:pre;' id='rewardYield'> </h1>
          </div>
          <space></space>
          <button id='claim' class='boxBtn'>Claim</button>
          <space></space>
          <p class='smaller' style='color:var(--color-grey);'>Next yield added in <span id='nextYield'></span></p>
        </div>
        <div>
          <p style='color:var(--color-grey);' class='smaller'>Your Stake:</p>
          <p id='stake'> </p>
          <space></space>

          <p style='color:var(--color-grey);' class='smaller'>Your Share in the Pool:</p>
          <p id='yieldShare'> </p>
          <space></space>

          <p style='color:var(--color-grey);' class='smaller'>Estimated Yield Per Epoch:</p>
          <p id='yield'> </p>
          <space></space>

          <p class='smaller' style='color:var(--color-grey);'>Rewards earned based on deposited HBT amount and Rollup activity.</p>
        </div>
      </div>
    </div>
    <div class='left box flip-card-back'>
      <h6 class='right-title'><em target='wrapper-yield' class='icon-info icon-flip'>${SVG_INFO_ICON}</em></h6>
      <p>The Habitat rollup is generating profits based on the activity and usage of the network. These profits are fairly distributed among all users and their individual amount of deposited HBT tokens on the rollup.</p>
      <p>The exact yield is depending on the fees earned during one epoch. An epoch is 7 days long. When you withdraw HBT before the epoch ends you won’t get any yield!</p>
    </div>
  </div>
</div>
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
  grid-template-columns: repeat(5, auto);
}
#history > div {
  grid-template-columns: repeat(3, auto);
}
#exits > div {
  grid-template-columns: repeat(3, auto);
}
.tab {
  padding: 0 1em;
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

.spaced-title {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.right-title {
  display: flex;
  justify-content: flex-end;
}

.flip-card {
  perspective: 40em;
  padding: 0;
}

.flip-wrapper {
  display: block;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}

.flip-card-front, .flip-card-back {
  position: relative;
  -webkit-backface-visibility: hidden; /* Safari */
  backface-visibility: hidden;
}

.flip-card-back {
  position: absolute;
  top: 0;
  color: var(--color-text-invert);
  transform: rotateY(180deg);
  background-color: var(--color-bg-invert);
}

.flip-card-back > p {
  color: var(--color-text-invert);
  margin-top: 1rem !important;
  font-size: .9rem;
}

.flip {
  transform: rotateY(180deg);
}

.icon-info {
  cursor: pointer;
}

.icon-info > svg > path {
  fill: var(--color-text);
}

.icon-flip > svg > path {
  fill: var(--color-text-invert) !important;
}

</style>
<section style='background-color:var(--color-bg-yellow);min-height:100%;'>
<div class='flex row' style='justify-content:space-between;width:100%;min-height:4em;'>
   <div class='flex row tabs left'>
    <div class='active'>
      <a target='#wallet-overview' class='secondary'>Balance</a>
    </div>
    <div>
      <a target='#wallet-stakes' class='secondary'>Proposals</a>
    </div>
    <div>
      <a target='#wallet-delegation' class='secondary'>Delegation</a>
    </div>
    <div>
      <a target='#wallet-rewards' class='secondary'>Rewards</a>
    </div>
  </div>

  <div class='flex row'>
    <h6 id='greeting'> </h6>
    <button id='name' class='flow smaller'>Change Username</button>
  </div>
</div>
<sep></sep>

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
  gap: 1em;
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
    <space></space>

      <div id='wallet-overview-inner'>
        <div class='box' style='grid-row:1/4;grid-column:1/2;padding:0;max-width:max-content;'>
          <habitat-transfer-box id='transfer-box'></habitat-transfer-box>
        </div>

        ${ACCOUNT_GAS_TANK_CARD_TEMPLATE}

        ${ACCOUNT_YIELD_CARD_TEMPLATE}

        <div class='left box' style='grid-row:2/4;grid-column:2/4;'>
          <h6><span><emoji-camping></emoji-camping><span> Rollup Balances</span></span></h6>
          <space></space>
          <div id='erc20'></div>
        </div>

        <div class='left box' style='grid-row:4/8;grid-column:2/4;'>
          <h6><span><emoji-dizzy></emoji-dizzy><span> Activities</span></span></h6>
          <space></space>
          <div id='history'></div>
        </div>

        <div id='tokenActions' class='flex row' style='visibility:hidden'>
          <button id='transfer' class='flow'></button>
          <button id='withdraw' class='flow'></button>
        </div>

        <div class='box left' style='grid-row:4;grid-column:1/1;'>
          <h6><span><emoji-airplane></emoji-airplane><span> Withdrawals</span></span></h6>
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

async function updateErc20 (root) {
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

  root.querySelector('#tokenActions').style.visibility = tokens.length ? 'visible' : 'hidden';

  if (!tokens.length) {
    return;
  }

  {
    // render balances
    const child = document.createElement('div');
    child.innerHTML = ACCOUNT_ERC20_PRE_TEMPLATE + ACCOUNT_ERC20_TEMPLATE.repeat(tokens.length);
    const children = child.children;
    let childPtr = 5;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const tokenAddr = tokens[i];
      const token = await getTokenV2(tokenAddr);
      const totalBalance = await habitat.callStatic.getBalance(tokenAddr, account);
      const stakedBalance = await habitat.callStatic.getActiveVotingStake(tokenAddr, account);
      const delegatedBalance = await getTotalDelegatedAmountForToken(tokenAddr, account);
      const availableBalance = totalBalance.sub(stakedBalance).sub(delegatedBalance);
      children[childPtr++].setAttribute('token', tokenAddr);

      children[childPtr++].textContent = renderAmount(totalBalance, token.decimals);
      children[childPtr++].textContent = renderAmount(availableBalance, token.decimals);
      children[childPtr++].textContent = renderAmount(stakedBalance, token.decimals);
      children[childPtr++].textContent = renderAmount(delegatedBalance, token.decimals);
    }
    const container = root.querySelector('#erc20');
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
      const { token, from, to, value, transactionHash } = transfers[(len - 1) - i];
      const isDeposit = from === ethers.constants.AddressZero;
      const isIncoming = to === account;
      const isExit = to === ethers.constants.AddressZero;
      const isTopUp = to.toLowerCase() === DEFAULT_ROLLUP_OPERATOR_ADDRESS;
      const erc = await getTokenV2(token);
      const amount = renderAmount(value, erc.decimals);
      let type = '';

      if (isDeposit) {
        type = 'Deposit';
      } else if (isExit) {
        type = 'Exit';
      } else if (isIncoming) {
        type = Number(from) < 0xffffffff ? 'Operator Reward' : 'Incoming';
      } else if (isTopUp) {
        type = 'Gas Top-up';
      } else {
        type = Number(to) < 0xffffffff ? 'Top-up Fee' : 'Outgoing';
      }

      // token
      children[childPtr++].setAttribute('token', token);
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
    const container = root.querySelector('#history');
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
      const tokenAddr = tokens[i];
      const { pendingAmount, availableAmount } = await getExitStatus(tokenAddr, account);

      const token = await getTokenV2(tokenAddr);
      const amount = ethers.utils.formatUnits(availableAmount, token.decimals);
      const disabled = !availableAmount.gt(0);

      children[childPtr++].setAttribute('token', tokenAddr);
      children[childPtr++].textContent = renderAmount(pendingAmount, token.decimals);
      children[childPtr++].textContent = renderAmount(availableAmount, token.decimals);
      //wrapListener(children[childPtr++], (evt) => root.querySelector('habitat-transfer-box').doExit(tokenAddr, amount));
    }
    const container = root.querySelector('#exits');
    if (container) {
      container.replaceChildren(child);
    }
  }
}

function onTab (evt) {
  const ACTIVE = 'active';
  const target = evt.target.getAttribute('target');
  const targetSection = this.shadowRoot.querySelector(target);
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
    for (const e of this.shadowRoot.querySelectorAll('.tabs div > a')) {
      wrapListener(e, onTab.bind(this));
    }

    wrapListener(this.shadowRoot.querySelector('button#name'), (evt) => new UsernameFlow(evt.target));
    wrapListener(
      this.shadowRoot.querySelector('#add747'),
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

    for (const e of this.shadowRoot.querySelectorAll('em.icon-info')) {
      wrapListener(e, () => {
        const wrapper = this.shadowRoot.querySelector(`#${e.getAttribute('target')}`);
        const flipped = wrapper.classList.toggle('flip');
        if (flipped) {
          setTimeout(() => {
            wrapper.classList.remove('flip');
          }, 30000); // return to front side of card
        }
      });
    }

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
    this.shadowRoot.querySelector('#greeting').textContent = user;

    const token = await getTokenV2(HBT);
    {
      const { value, ratePerTx, remainingEstimate } = await getGasTank(account);
      this.shadowRoot.querySelector('#gasTankRemaining').textContent = remainingEstimate.toString();
      this.shadowRoot.querySelector('#ratePerTx').textContent = `${renderAmount(ratePerTx, token.decimals)} ${token.symbol}`;
      this.shadowRoot.querySelector('#gasTankBalance').textContent = `${renderAmount(value, token.decimals)} ${token.symbol}`;
    }

    // rewards
    {
      const {
        claimable,
        sinceEpoch,
        secondsUntilNextEpoch,
        currentStake,
        estimatedYieldEpoch,
        currentPoolShare,
        poolShareDivider,
      } = await calculateRewards(token);

      this.shadowRoot.querySelector('#rewardYield').textContent = `${renderAmount(claimable, token.decimals)} HBT`;
      this.shadowRoot.querySelector('#nextYield').textContent = secondsToString(secondsUntilNextEpoch);
      const claimBtn = this.shadowRoot.querySelector('#claim');
      wrapListener(claimBtn, () => sendTransaction('ClaimStakingReward', { sinceEpoch, token: token.address }));
      claimBtn.disabled = !claimable;

      this.shadowRoot.querySelector('#stake').textContent = `${renderAmount(currentStake, token.decimals)} ${token.symbol}`;
      this.shadowRoot.querySelector('#yieldShare').textContent =
        `${((Number(currentPoolShare) / Number(poolShareDivider)) * 100).toFixed(4)}%`;
      this.shadowRoot.querySelector('#yield').textContent = `${renderAmount(estimatedYieldEpoch, token.decimals)} ${token.symbol}`;
    }

    await updateErc20(this.shadowRoot);
  }

}
customElements.define('habitat-account', HabitatAccount);
