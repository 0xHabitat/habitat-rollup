import {
  wrapListener,
  renderAddress,
  renderAmount,
  ethers,
  secondsToString,
  getSigner,
  formatDate,
  getEtherscanLink,
} from './utils.js';
import {
  getProviders,
  fetchProposalStats,
  VotingStatus,
  renderLabels,
  getModuleInformation,
  simulateProcessProposal,
  getProposalInformation,
  onChainUpdate,
  sendTransaction,
  executeProposalActions,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';
import HabitatProposeCard from './HabitatProposeCard.js';
import './HabitatProposalActionList.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
#title {
  display: block;
  max-height: 2em;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1em;
}
#details {
  display: block;
  max-width: 100%;
  max-height: 4em;
  text-overflow: ellipsis;
  overflow: hidden;
  font-weight: lighter;
}
#details * {
  color: var(--color-grey) !important;
  font-weight: lighter !important;
  overflow: hidden;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
#body {
  width: 30em;
  max-width: 100%;
}
.shareBtn {
  width: 2em;
  height: 2em;
  min-width: auto;
  max-width: none;
  padding: 0;
  margin: 0;
  border-radius: 100%;
  box-shadow: none;
}
.shareBtn:hover,
.shareBtn:active {
  box-shadow: none;
  transform: none;
}
.shareBtn.right {
  position: relative;
  left: -2em;
}
.shareBtn.left {
  position: relative;
  right: -2em;
}
.shareBtn.bold {
  border-width: 3px;
  font-weight: bold;
}
#inputShares {
  font-size: 1em;
  min-width: 2em;
  max-width: none;
  height: 2em;
  width: 8em;
  border-radius: 2em;
  padding: .5em 2em;
  text-align: center;
  border: none;
  background-color: var(--color-bg);
}
.expand {
  place-content: flex-end;
  position: relative;
  top: 1em;
  height: 0;
  cursor: pointer;
}
.expandable {
  height: 0;
  overflow: hidden;
  transform: rotateY(90deg);
  -moz-backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.expanded {
  height: auto;
  transform: none;
}
.indicator,
.indicator #inner,
.indicator #innerRight,
.indicator pin {
  user-select: none;
  -webkit-user-select: none;
}
.indicator {
  display: block;
  width: calc(100% - 11em);
  height: 2em;
  position: relative;
  top: 2em;
  margin-top: -1em;
  border: none;
  border-radius: 2em;
  background-color: #f0f0f0;
  overflow: hidden;
}
.indicator #inner,
.indicator #innerRight {
  position: relative;
  border-radius: 2em;
  border: none;
  height: 2em;
  width: 100%;
  box-sizing: border-box;
  transition: all .07s linear;
  background: linear-gradient(90deg, rgba(15, 117, 85, 0.7) 0%, rgba(206, 227, 78, 0.7) 50%, rgba(255, 59, 59, 0.7) 100%);
  background-clip: content-box;
  padding-right: 100%;
  line-height: 2;
  color: rgba(0, 0, 0, .4);
}
.indicator #innerRight {
  padding-right: 0;
  padding-left: 100%;
  top: -100%;
}
.indicator pin {
  display: block;
  position: relative;
  left: 0;
  width: .9rem;
  height: .9rem;
  max-width: .9rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  margin-left: -.45rem;
  border-radius: 100%;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.5);
  background-color: var(--color-white);
  cursor: pointer;
  display:none;
}
.indicator button:hover,
.indicator button:focus,
.indicator button:active {
  transition: none;
  box-shadow:none;
}
#binaryIndicator #inner {
  background: rgb(85, 156, 132);
  background-clip: content-box;
}
#binaryIndicator #innerRight {
  background: rgb(250, 118, 114);
  background-clip: content-box;
}
.lbl {
  color: var(--color-grey);
  font-weight: ligther;
}
#infobox {
  line-height: 1;
  padding: .5em 1em;
  border-radius: 1em;
  border: 1px solid var(--color-bg-invert);
}
#infobox > .b {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  place-items: start;
}
#infobox > .b > * {
  line-height: 1.5;
  margin: 0;
}
#subProposals {
  padding-left: 2em;
}
#subProposals > * {
  display: block;
  margin: 2em 1em;
}
a#expand {
  text-decoration: underline;
}
button, .button, button *, .button * {
  background-color: var(--color-bg-button);
  color: var(--color-button);
  border-color: var(--color-border-button);
  transition: all .3s ease-out;
}
:host(:not([flavor])) .flavor-signal,
:host(:not([flavor])) .flavor-binary {
  display: none;
}
:host([flavor="binary"]) .flavor-signal,
:host([flavor="signal"]) .flavor-binary {
  display: none;
}
#yes, #no {
  width: 3em;
  border-radius: 2em;
}
.lessmore {
  cursor: pointer;
  overflow: hidden;
}
.lessmore::after {
  content: '';
  display: block;
  height: 1px;
  width: 100%;
  margin-top: 1px;
  transform: translateX(-100%);
  transition: transform .2s ease-in;
  background-color: var(--color-bg-invert);
}
.lessmore:hover::after {
  transform: translateX(0);
}
</style>
<div class='box'>
  <!---
  <div class='flex row expand'>
    <span>&#x25bc;</span>
  </div>
  -->
  <div class='flex row between'>
    <div class='flex col align-left' style='min-width:50%;max-width:40ch;'>
      <div class='lessmore'>
        <p id='title'> </p>
      </div>
      <space></space>
      <p id='details'> </p>
      <space></space>
      <a href='' id='expand' class='lbl s'>MORE INFO</a>
    </div>
    <a id='id' class='s lbl' style='align-self:start;'> </a>
    <div class='flex col mtb'>
      <div id='changeSignal' class='flex row flavor-signal'>
        <button id='sub' class='shareBtn left'><span style='vertical-align:text-top;'>-</span></button>
        <input id='inputShares' placeholder='0'>
        <button id='add' class='shareBtn right'><span style='vertical-align:text-top;'>+</span></button>
      </div>

      <div id='changeBinary' class='flex row flavor-binary'>
        <button id='no' class='shareBtn left'><span style='vertical-align:text-top;'>No</span></button>
        <input id='inputShares' placeholder='0'>
        <button id='yes' class='shareBtn right'><span style='vertical-align:text-top;'>Yes</span></button>
      </div>
    </div>
  </div>

  <div id='signalIndicator' class='indicator flavor-signal'><div id='inner'></div></div>
  <div id='binaryIndicator' class='indicator flavor-binary'><div id='inner'>YES</div><div id='innerRight'>NO</div></div>

  <div class='expandable'>
    <space></space>
    <space></space>
    <space></space>
    <div id='labels' class='flex row'></div>
    <div class='flex row between' style='align-items:start;'>
      <div class='flex col align-left' style='max-width: 40em;'>
        <p class='s lbl'>TITLE</p>
        <p class='bold l' id='title'>-</p>
        <space></space>
        <p class='s lbl'>INFO</p>
        <p class='m' id='body'>-</p>
        <space></space>
      </div>
      <div class='flex col align-left'>
        <div id='infobox' class='flex col align-left'>
          <div class='a'>
            <p>INFORMATION</p>
            <space></space>
          </div>

          <div class='b'>
            <p class='lbl s'>proposer</p>
            <a target='_blank' id='proposer' class='smaller center bold text-center'> </a>

            <p class='lbl s'>Link</p>
            <a target='_blank' id='externalLink' class='smaller center bold text-center'>-</a>

            <p class='lbl s'>total votes</p>
            <p id='totalVotes' class='text-center smaller bold'></p>

            <p class='lbl s'>total shares</p>
            <p id='totalShares' class='text-center smaller bold'></p>

            <p class='lbl s'>Shares - Yes</p>
            <p id='sharesYes' class='smaller center bold text-center'> </p>

            <p class='lbl s'>Shares - No</p>
            <p id='sharesNo' class='smaller center bold text-center'> </p>

            <p class='lbl s'>Average Signal</p>
            <p id='avgSignal' class='text-center smaller bold'></p>

            <p class='lbl s'>quorum threshold</p>
            <p id='quorum' class='smaller center bold text-center'> </p>

            <p class='lbl s'>Participation</p>
            <p id='participationRate' class='smaller center bold text-center'> </p>

            <space></space>
            <space></space>
            <p class='lbl s'>your vote</p>
            <p id='userShares' class='text-center smaller bold'></p>

            <p class='lbl s'>your signal</p>
            <p id='userSignal' class='text-center smaller bold'></p>
            <space></space>
            <space></space>

            <p class='lbl s'>start date</p>
            <p id='startDate' class='smaller center bold text-center'> </p>

            <p class='lbl s'>end date</p>
            <p id='endDate' class='smaller center bold text-center'> </p>

            <p class='lbl s'>open since</p>
            <p id='time' class='smaller center bold text-center'> </p>

            <p class='lbl s'>closes in</p>
            <p id='tillClose' class='smaller center bold text-center'> </p>

          </div>
        </div>

        <space></space>
        <div class='flex row align-left between s' style='width:100%;'>
          <space></space>
          <button id='processProposal' disabled>Finalize Proposal</button>
          <space></space>
          <button id='execProposal' disabled>Execute Mainnet Actions</button>
        </div>

      </div>
    </div>

    <space></space>
    <div class='flex col align-left' id='actionContainer' style='display:none;'>
      <p class='l bold'>Action</p>
      <habitat-proposal-action-list></<habitat-proposal-action-list>
    </div>
  </div>
</div>
<div class='flex col'>
  <button id='boxleg' style='display:none;'>+ subtopic</button>
</div>
<div id='subProposals'></div>
`;

const ATTR_HASH = 'hash';
const ATTR_DELEGATE_MODE = 'delegate-mode';
const ATTR_REF_SIGNAL = 'ref-signal';
const ATTR_FLAVOR = 'flavor';
const ATTR_SIGNAL_VAULT = 'signal-vault';
const ATTR_ACTION_VAULT = 'action-vault';

export default class HabitatProposalCard extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_HASH, ATTR_DELEGATE_MODE, ATTR_REF_SIGNAL, ATTR_FLAVOR];
  }

  constructor() {
    super();

    this.totalSharesExcludingUser = 0;
    this.cumulativeSharesExcludingUser = 0;
    this.userVotedShares = 0;
    this.cumulativeUserVotedShares = 0;
    // binary voting
    this.userSignal = 0;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    // title, more info
    wrapListener(this.shadowRoot.querySelector('#title'), this.toggleExpand.bind(this));
    wrapListener(this.shadowRoot.querySelector('a#expand'), this.toggleExpand.bind(this));

    for (const node of this.shadowRoot.querySelectorAll('#inputShares')) {
      wrapListener(node, this.onSignalChange.bind(this), 'change');
      const isSignalContainer = node.parentElement.classList.contains('flavor-signal');
      function change (self, v) {
        if (isSignalContainer) {
          const n =  Number(node.value) + v;
          node.value = n;
          self.userSignal = n > 0 ? 100 : 0;
        } else {
          self.userSignal = v === 1 ? 100 : 1;
        }
        node.dispatchEvent(new Event('change'));
      }
      wrapListener(node.parentElement.querySelector('.right'), (evt) => change(this, 1));
      wrapListener(node.parentElement.querySelector('.left'), (evt) => change(this, -1));
    }

    wrapListener(
      this.shadowRoot.querySelector('#boxleg'),
      () => {
        const e = new HabitatProposeCard();
        e.setAttribute('topic', this.getAttribute(ATTR_HASH));
        e.setAttribute('proposal-type', this.getAttribute(ATTR_FLAVOR) === 'signal' ? 'Signal' : 'Action');
        e.setAttribute(ATTR_SIGNAL_VAULT, this.getAttribute(ATTR_SIGNAL_VAULT));
        e.setAttribute(ATTR_ACTION_VAULT, this.getAttribute(ATTR_ACTION_VAULT));
        this.subSignals.prepend(e);
      }
    );

    wrapListener(
      this.shadowRoot.querySelector('#processProposal'),
      async () => {
        const args = {
          proposalId: this.data.proposalId,
          internalActions: this.data.tx.message.internalActions,
          externalActions: this.data.tx.message.externalActions,
        };

        await sendTransaction('ProcessProposal', args);
      }
    );

    wrapListener(
      this.shadowRoot.querySelector('#execProposal'),
      async () => {
        const tx = await executeProposalActions(
          this.data.tx.message.vault,
          this.data.proposalId,
          this.data.tx.message.externalActions
        );
        // lazy :)
        window.open(getEtherscanLink(tx.hash), '_blank');
      }
    );
  }

  connectedCallback () {
    onChainUpdate(this.chainUpdateCallback.bind(this));
  }

  async chainUpdateCallback () {
    if (this.isConnected) {
      onChainUpdate(this.chainUpdateCallback.bind(this));
      await this.update();
    }
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === ATTR_HASH) {
      return this.update();
    }
    if (name === ATTR_REF_SIGNAL) {
      return this.calculateSignal();
    }
    if (name === ATTR_FLAVOR) {
      return this.renderFlavor(newValue);
    }
    if (name === ATTR_DELEGATE_MODE) {
      // propagate
      for (const node of this.childProposals) {
        node.setAttribute(name, newValue);
      }
      this.render(this.data);
      return;
    }
  }

  get inputShares () {
    return this.shadowRoot.querySelector(this.isSignalMode ? '#changeSignal #inputShares' : '#changeBinary #inputShares');
  }

  get shares () {
    return Number(this.inputShares.value);
  }

  set shares (v) {
    const e = this.inputShares;
    e.value = Math.max(this.cumulativeUserVotedShares, v);
    e.dispatchEvent(new Event('change'));
  }

  get subSignals () {
    return this.shadowRoot.querySelector('#subProposals');
  }

  calculateSignal () {
    if (!this.data) {
      console.warn('too early');
      return;
    }

    let refSignal = Number(this.getAttribute(ATTR_REF_SIGNAL));
    if (!refSignal) {
      const parent = this.parentElement;
      if (parent) {
        refSignal = Number(parent.getAttribute(ATTR_REF_SIGNAL));
      }
    }
    const _refSignal = this.cumulativeSharesExcludingUser + this.cumulativeUserVotedShares;
    this.subSignals.setAttribute(ATTR_REF_SIGNAL, _refSignal);

    const totalCumulativeShares =
      this.totalSharesExcludingUser +
      this.userVotedShares +
      this.cumulativeSharesExcludingUser +
      this.cumulativeUserVotedShares;
    const strength = (totalCumulativeShares * 100) / (refSignal || 1);
    this.shadowRoot.querySelector('#signalIndicator #inner').style.paddingRight = `${100 - Math.min(100, strength)}%`;

    for (const node of this.childProposals) {
      node.calculateSignal();
    }

    this.renderFlavor(this.getAttribute(ATTR_FLAVOR));
  }

  get childProposals () {
    return this.subSignals.querySelectorAll('habitat-proposal-card');
  }

  get cumulativeUserShares () {
    let ret = this.userVotedShares;

    for (const node of this.childProposals) {
      ret += node.cumulativeUserShares;
    }

    return ret;
  }

  get cumulativeShares () {
    let ret = this.totalSharesExcludingUser;

    for (const node of this.childProposals) {
      ret += node.cumulativeShares;
    }

    return ret;
  }

  addSubTopic (e) {
    if (this.subSignals.querySelector(`[hash="${e.getAttribute('hash')}"]`)) {
      console.warn('already added');
      return;
    }

    e.addEventListener('signalChange', async (evt) => {
      this.cumulativeSharesExcludingUser = 0;
      this.cumulativeUserVotedShares = 0;
      if (this.isSignalMode) {
        for (const node of this.childProposals) {
          this.cumulativeSharesExcludingUser += node.cumulativeShares;
          this.cumulativeUserVotedShares += node.cumulativeUserShares;
        }

        this.shares = this.userVotedShares + this.cumulativeUserVotedShares;
      }
    }, false);
    this.subSignals.prepend(e);
  }

  set subtopicSupport (v) {
    this.shadowRoot.querySelector('#boxleg').style.display = v ? 'flex' : 'none';
  }

  get isSignalMode () {
    return this.getAttribute(ATTR_FLAVOR) === 'signal';
  }

  onSignalChange (evt) {
    for (const node of this.shadowRoot.querySelector('#changeSignal').children) {
      node.classList.remove('bold');
    }

    const newValue = Math.max(this.cumulativeUserVotedShares, Number(evt.target.value));
    this.userVotedShares = newValue - this.cumulativeUserVotedShares;
    evt.target.value = newValue;

    if (this.userVotedShares > this.lastVotedShares) {
      this.shadowRoot.querySelector('#add').classList.add('bold');
    } else if (this.userVotedShares < this.lastVotedShares) {
      this.shadowRoot.querySelector('#sub').classList.add('bold');
    }

    this.calculateSignal();
    this.dispatchEvent(new Event('signalChange'));
  }

  onChainUpdateCallback () {
    if (this.isConnected) {
      onChainUpdate(this.onChainUpdateCallback.bind(this));
      return this.update();
    }
  }

  async update () {
    const txHash = this.getAttribute(ATTR_HASH);
    let data = await getProposalInformation(txHash);

    {
      // title / link elements
      const titleElement = this.shadowRoot.querySelector('#title');
      titleElement.textContent = data.title;
      this.shadowRoot.querySelector('.expandable #title').textContent = data.title;
      this.shadowRoot.querySelector('#id').textContent = 'ID#' +
        data.proposalId.substring(2, 6) + '...' + data.proposalId.substring(data.proposalId.length, data.proposalId.length - 4);

      const html = data.metadata.details || 'no description';
      // XXX: safe embedding
      this.shadowRoot.querySelector('#details').innerHTML = html;
      this.shadowRoot.querySelector('.expandable #body').innerHTML = html;

      renderLabels(data.metadata.labels || [], this.shadowRoot.querySelector('#labels'));
    }

    data = Object.assign(data, await fetchProposalStats(data));
    this.render(data);
  }

  async render (data) {
    const oldData = this.data;
    this.data = data;
    const isDelegationMode = !!this.getAttribute(ATTR_DELEGATE_MODE);
    const userShares = Number(isDelegationMode ? this.data.delegatedUserShares : this.data.userShares);
    const userSignal = Number(isDelegationMode ? this.data.delegatedUserSignal : this.data.userSignal);
    const totalShares = this.data.totalShares;

    if (
      !oldData ||
      oldData.userShares !== this.data.userShares ||
      oldData.userSignal !== this.data.userSignal ||
      oldData.delegatedUserShares !== this.data.delegatedUserShares ||
      oldData.delegatedUserSignal !== this.data.delegatedUserSignal
    ) {
      this.lastVotedShares = userShares;
      this.userVotedShares = userShares;
      this.userSignal = userSignal;
      this.oldUserSignal = userSignal;
    }
    this.totalSharesExcludingUser = totalShares - this.userVotedShares;

    this.shadowRoot.querySelector('#totalVotes').textContent = this.data.totalVotes;
    this.shadowRoot.querySelector('#totalShares').textContent = `${this.data.totalShares} ${this.data.token.symbol}`;
    this.shadowRoot.querySelector('#sharesYes').textContent = `${this.data.totalYesShares} ${this.data.token.symbol}`;
    this.shadowRoot.querySelector('#avgSignal').textContent = `${this.data.signalStrength.toFixed(2)}%`;
    this.shadowRoot.querySelector('#sharesNo').textContent = `${this.data.totalNoShares} ${this.data.token.symbol}`;
    this.shadowRoot.querySelector('#userShares').textContent = `${userShares} ${this.data.token.symbol}`;
    this.shadowRoot.querySelector('#userSignal').textContent = `${userSignal}/100`;
    this.shadowRoot.querySelector('#participationRate').textContent = `${this.data.participationRate.toFixed(2)}%`;
    if (this.data.metadata.src) {
      try {
        const e = this.shadowRoot.querySelector('#externalLink');
        e.textContent = (new URL(this.data.metadata.src)).hostname;
        e.href = this.data.metadata.src;
      } catch (e) {}
    }
    {
      const proposer = this.shadowRoot.querySelector('#proposer');
      proposer.textContent = renderAddress(this.data.tx.from);
      proposer.href = getEtherscanLink(this.data.tx.from);
    }
    if (this.data.tx.message.internalActions !== '0x' || this.data.tx.message.externalActions !== '0x') {
      this.shadowRoot.querySelector('#actionContainer').style.display = 'flex';
      this.shadowRoot.querySelector('habitat-proposal-action-list').decode(this.data.tx.message);
    }

    // sub the vote
    if (userSignal > 50) {
      this.data.totalYes--;
    } else if (userSignal !== 0) {
      this.data.totalNo--;
    }

    const { flavor } = await getModuleInformation(this.data.vaultAddress);
    this.setAttribute(ATTR_FLAVOR, flavor || 'binary');
    // will trigger recalculation
    this.shares = this.userVotedShares + this.cumulativeUserVotedShares;

    const { startDate } = this.data;
    let statusText = '-';
    let tillClose = '-';
    let endText = 'closed';
    let quorumText = '100%';
    if (this.data.proposalStatus > VotingStatus.OPEN) {
      statusText = this.data.proposalStatusText;
      this.shadowRoot.querySelector('#processProposal').disabled = true;

      this.shadowRoot.querySelector('#execProposal').disabled =
        this.data.proposalStats !== VotingStatus.PASSED || this.data.tx.message.externalActions === '0x';
    } else {
      const simResult = await simulateProcessProposal(
        {
          proposalId: this.data.proposalId,
          internalActions: this.data.tx.message.internalActions,
          externalActions: this.data.tx.message.externalActions,
        }
      );
      const votingDisabled = simResult.votingStatus > VotingStatus.OPEN;
      statusText = votingDisabled ? 'Proposal Concluded' : secondsToString(~~(Date.now() / 1000) - startDate);
      tillClose = simResult.secondsTillClose === -1 ? '∞' : secondsToString(simResult.secondsTillClose);
      endText = simResult.secondsTillClose === -1 ? '-' : formatDate((startDate + simResult.secondsTillClose) * 1000);
      quorumText = `${simResult.quorumPercent}%`;

      this.shadowRoot.querySelector('#processProposal').disabled = !votingDisabled;
      this.shadowRoot.querySelector('#execProposal').disabled = true;
    }

    this.shadowRoot.querySelector('#startDate').textContent = formatDate(startDate * 1000);
    this.shadowRoot.querySelector('#endDate').textContent = endText;
    this.shadowRoot.querySelector('#tillClose').textContent = tillClose;
    this.shadowRoot.querySelector('#time').textContent = statusText;
    this.shadowRoot.querySelector('#quorum').textContent = quorumText;
  }

  async buildTransactions (delegatedFor) {
    const txs = [];

    if (this.data && this.data.token) {
      if (this.lastVotedShares !== this.userVotedShares || this.userSignal !== this.oldUserSignal) {
        const signalStrength = this.userVotedShares === 0 ? 0 : this.userSignal;
        const title = this.shadowRoot.querySelector('#title').textContent.substring(0, 10) + '...';
        txs.push({
          primaryType: 'VoteOnProposal',
          message: {
            proposalId: this.data.proposalId,
            signalStrength,
            shares: ethers.utils.parseUnits(this.userVotedShares.toString(), this.data.token.decimals).toHexString(),
            delegatedFor: delegatedFor,
          },
          info: `${delegatedFor === ethers.constants.AddressZero ? 'Vote' : 'Delegated Vote'} on ${title}`,
        });
      }
    }

    for (const node of this.childProposals) {
      txs.push(...(await node.buildTransactions(delegatedFor)));
    }

    return txs;
  }

  renderFlavor (flavor) {
    if (flavor === 'binary') {
      for (const node of this.shadowRoot.querySelector('#changeBinary').children) {
        node.classList.remove('bold');
      }
      if (this.userSignal !== 0) {
        this.shadowRoot.querySelector(this.userSignal > 50 ? '#yes' : '#no').classList.add('bold');
      }

      let { totalYes, totalNo } = this.data;
      if (this.userSignal > 50) {
        totalYes++;
      } else if (this.userSignal !== 0) {
        totalNo++;
      }
      const totalVotes = totalYes + totalNo;
      const accept = totalVotes > 0 ? (totalYes * 100) / totalVotes : 0;
      const reject = totalVotes > 0 ? (totalNo * 100) / totalVotes : 0;

      let left = 'calc(100% - 2em)';
      let right = left;
      if (reject || accept) {
        left = `${100 - Math.min(100, accept)}% `;
        right = `${100 - Math.min(100, reject)}%`;
      }
      this.shadowRoot.querySelector('#binaryIndicator #inner').style.paddingRight = left;
      this.shadowRoot.querySelector('#binaryIndicator #innerRight').style.paddingLeft = right;

      return;
    }
  }

  toggleExpand () {
    const LESS = 'LESS INFO';
    const MORE = 'MORE INFO';
    const e = this.shadowRoot.querySelector('#expand');
    e.textContent = e.textContent === LESS ? MORE : LESS;
    for (const node of this.shadowRoot.querySelectorAll('.expandable')) {
      node.classList.toggle('expanded');
    }
  }
}
customElements.define('habitat-proposal-card', HabitatProposalCard);
