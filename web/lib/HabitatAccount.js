import {
  getSigner,
  wrapListener,
  renderAddress,
  renderAmount,
  walletIsConnected,
  getEtherscanTokenLink,
  getNetwork,
  getConfig,
  getTokenV2,
  secondsToString,
  ethers
} from './utils.js';
import {
  doQuery,
  getProviders,
  getUsername,
  getExitStatusV2,
  getBlockExplorerLink,
  getGasTank,
  queryTransfers,
  doQueryCustom,
  sendTransaction,
  getTotalDelegatedAmountForToken,
} from './rollup.js';
import { UsernameFlow } from './flows.js';
import { calculateRewards } from './rewards.js';
import { setupTabs } from './tabs.js';
import TYPED_DATA from './typedData.js';

import HabitatPanel from './HabitatPanel.js';
import './HabitatTransferBox.js';
import './HabitatSlider.js';
import './HabitatCircle.js';
import './HabitatStakes.js';
import './HabitatRewards.js';
import './HabitatDelegationView.js';
import './HabitatTokenElement.js';
import './HabitatLiquidityRewards.js';
import './HabitatFlipCard.js';

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
<p>Amount</p>
<p>Status</p>
`;

const ACCOUNT_EXITS_TEMPLATE = document.createElement('template');
ACCOUNT_EXITS_TEMPLATE.innerHTML =
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

const ACCOUNT_GAS_TANK_CARD_TEMPLATE = `
<habitat-flip-card style='grid-row:1/2;grid-column:3/6;'>
  <div slot='front'>
    <h6 class='spaced-title'><span><emoji-fuel-pump></emoji-fuel-pump><span> Gas Tank Balance</span></span></h6>
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
  <div slot='back'>
    <p class='info-text'>To secure the network and all the user and community funds the Habitat rollup needs Gas to operate.</p>
    <p class='info-text'>Like a pre-paid phone the user tops up it's balance to interact with all features, modules and functionalities.</p>
    <p class='info-text'>A 1% top-up fee is taken and distributed among all HBT stakers/deposits.</p>
  </div>
</habitat-flip-card>`;

const ACCOUNT_YIELD_CARD_TEMPLATE = `
<habitat-flip-card style='grid-row:1/4;grid-column:6/8;'>
  <div slot='front'>
    <h6 class='spaced-title'><span><emoji-money-with-wings></emoji-money-with-wings><span> Rollup Yield </span></span></h6>
    <space></space>
    <div class='flex col'>
      <div class='flex col'>
        <h1 style='white-space:pre;' id='rewardYield'> </h1>
        <button id='claim' class='boxBtn'>Claim</button>
        <space></space>
        <p class='smaller' style='color:var(--color-grey);'>Next yield added in <span id='nextYield'></span></p>
        <space></space>
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
  <div slot='back'>
    <p class='info-text'>The Habitat rollup is generating profits based on the activity and usage of the network. These profits are fairly distributed among all users and their individual amount of deposited HBT tokens on the rollup.</p>
    <p class='info-text'>The exact yield is depending on the fees earned during one epoch. An epoch is 7 days long. When you withdraw HBT before the epoch ends you won’t get any yield!</p>
  </div>
</habitat-flip-card>`;

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
#tabs {
  perspective: none;
  transform: translateZ(0);
}
#tabs > div {
  width: 100%;
  height: 0;
  -moz-backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform-style: flat;
  transform: rotateY(-90deg) translateZ(0);
  transition: transform .2s ease-out;
}
#tabs > div.selected {
  height: auto;
  transform: none;
  transition: transform .3s ease-in;
}
#tabnav > div {
  padding: .5em 0;
  border-bottom: 2px solid transparent;
}
#tabnav p {
  margin: 0 1em;
  cursor: pointer;
}
#tabnav .selected {
  border-bottom-color: var(--color-bg-invert) !important;
  transition: border .1s ease-in;
}
.info-text {
  color: var(--color-text-invert);
}
#content {
  padding: 0 var(--panel-padding);
}
#wallet-overview-inner {
  display: grid;
  gap: 1em;
  grid-auto-rows: auto;
}
@media (max-width: 1100px) {
  #wallet-overview-inner {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-wrap: wrap;
    place-content: center;
  }
}
.interactive {
  text-decoration: underline;
  cursor: pointer;
}
</style>
<div class='flex row' style='justify-content:space-between;width:100%;min-height:4em;'>
  <div id='tabnav' class='flex row left'>
    <div id='wallet-overview'>
      <p class='l'>Balance</p>
    </div>
    <div id='wallet-stakes'>
      <p class='l'>Proposals</p>
    </div>
    <div id='wallet-delegation'>
      <p class='l'>Delegation</p>
    </div>
    <div id='wallet-rewards'>
      <p class='l'>Rollup Rewards</p>
    </div>
    <div id='wallet-liquidity-rewards'>
      <p class='l'>Liquidity Rewards</p>
    </div>
  </div>

  <div class='flex row'>
    <h6 id='greeting'> </h6>
    <button id='name' class='flow smaller'>Change Username</button>
  </div>
</div>
<sep></sep>
<div id='tabs'>
  <div class='tab' id='wallet-overview'>
    <div class='flex col center'>

      <div style='place-self:flex-end;' class='flex'>
        <button id='add747' class='smaller'>Add HBT to <img style='display:inline;height:1em' src='/lib/assets/icons/metamask-fox.svg'></button>
      </div>
      <space></space>

      <div id='wallet-overview-inner'>
        <div class='box' style='grid-row:1/4;grid-column:1/3;padding:0;max-width:max-content;'>
          <habitat-transfer-box id='transfer-box'></habitat-transfer-box>
        </div>

        ${ACCOUNT_GAS_TANK_CARD_TEMPLATE}

        ${ACCOUNT_YIELD_CARD_TEMPLATE}

        <div class='left box' style='grid-row:4/8;grid-column:1/8;'>
          <h6><span><emoji-camping></emoji-camping><span> Rollup Balances</span></span></h6>
          <space></space>
          <div id='erc20'></div>
        </div>

        <div class='box left' style='grid-row:2/4;grid-column:3/6;'>
          <h6><span><emoji-airplane></emoji-airplane><span> Withdrawals</span></span></h6>
          <space></space>
          <div id='exits'></div>
          <space></space>
        </div>

        <div class='left box' style='grid-row:8/12;grid-column:1/8;'>
          <h6><span><emoji-dizzy></emoji-dizzy><span> Activities</span></span></h6>
          <space></space>
          <div id='history'></div>
        </div>

      </div>
    </div>
    <space></space>
  </div>

  <div class='tab' id='wallet-stakes'>
    <habitat-stakes></habitat-stakes>
    <space></space>
  </div>

  <div class='tab' id='wallet-delegation'>
    <div class='flex center'>
      <habitat-delegation-view></habitat-delegation-view>
    </div>
    <space></space>
  </div>

  <div class='tab' id='wallet-rewards'>
    <div class='flex center'>
      <habitat-rewards></habitat-rewards>
    </div>
    <space></space>
  </div>

  <div class='tab' id='wallet-liquidity-rewards'>
    <div class='flex center'>
      <habitat-liquidity-rewards></habitat-liquidity-rewards>
    </div>
    <space></space>
  </div>
</div>
`;

class HabitatAccount extends HabitatPanel {
  static TEMPLATE = ACCOUNT_TEMPLATE;

  constructor() {
    super();

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

    setupTabs(this.shadowRoot);
  }

  get title () {
    return 'Account Overview';
  }

  async render () {
    this.updateAccount();
  }

  async chainUpdateCallback () {
    await this.updateAccount();
  }

  async updateAccount () {
    if (!this.isConnected) {
      return;
    }

    await Promise.all(
      [
        this.updateUser(),
        this.updateGasTank(),
        this.updateRewards(),
        this.updateActivity(),
      ]
    );
  }

  async updateUser () {
    const signer = await getSigner();
    const account = await signer.getAddress();
    const user = await getUsername(account, true);
    this.shadowRoot.querySelector('#greeting').textContent = user;
  }

  async updateGasTank () {
    const signer = await getSigner();
    const account = await signer.getAddress();
    const token = await getTokenV2(HBT);
    const { value, ratePerTx, remainingEstimate } = await getGasTank(account);
    this.shadowRoot.querySelector('#gasTankRemaining').textContent = remainingEstimate.toString();
    this.shadowRoot.querySelector('#ratePerTx').textContent = `${renderAmount(ratePerTx, token.decimals)} ${token.symbol}`;
    this.shadowRoot.querySelector('#gasTankBalance').textContent = `${renderAmount(value, token.decimals)} ${token.symbol}`;
  }

  async updateRewards () {
    const token = await getTokenV2(HBT);
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

  async updateActivity () {
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
      const container = this.shadowRoot.querySelector('#erc20');
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
        const isWithdraw = to === ethers.constants.AddressZero;
        const isTopUp = to.toLowerCase() === DEFAULT_ROLLUP_OPERATOR_ADDRESS;
        const erc = await getTokenV2(token);
        const amount = renderAmount(value, erc.decimals);
        let type = '';

        if (isDeposit) {
          type = 'Deposit';
        } else if (isWithdraw) {
          type = 'Withdraw';
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
      const container = this.shadowRoot.querySelector('#history');
      if (container) {
        container.replaceChildren(child);
      }
    }

    {
      // exits
      const child = document.createElement('div');
      child.innerHTML = ACCOUNT_EXITS_PRE_TEMPLATE;
      for (let i = 0, len = tokens.length; i < len; i++) {
        const tokenAddr = tokens[i];
        const token = await getTokenV2(tokenAddr);
        const { pendingAmounts, availableAmount } = await getExitStatusV2(tokenAddr, account);

        if (availableAmount.gt(0)) {
          const amount = ethers.utils.formatUnits(availableAmount, token.decimals);
          const template = ACCOUNT_EXITS_TEMPLATE.content.cloneNode(true);
          const childs = template.children;

          childs[0].setAttribute('token', tokenAddr);
          childs[1].textContent = renderAmount(availableAmount, token.decimals);
          childs[2].textContent = 'Ready to Exit';
          childs[2].classList.add('interactive');
          wrapListener(childs[2], (evt) => this.shadowRoot.querySelector('habitat-transfer-box').doExit(tokenAddr, amount));
          child.append(template);
        }

        for (const e of pendingAmounts) {
          const template = ACCOUNT_EXITS_TEMPLATE.content.cloneNode(true);
          const childs = template.children;

          childs[0].setAttribute('token', tokenAddr);
          childs[1].textContent = renderAmount(e.value, token.decimals);
          childs[2].textContent = `Ready in ~${secondsToString(e.finalityEstimate)}`;

          child.append(template);
        }
      }
      const container = this.shadowRoot.querySelector('#exits');
      if (container) {
        container.replaceChildren(child);
      }
    }
  }
}
customElements.define('habitat-account', HabitatAccount);
