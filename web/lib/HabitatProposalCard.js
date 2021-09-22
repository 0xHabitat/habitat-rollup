import {
  wrapListener,
  renderAddress,
  renderAmount,
  ethers,
  secondsToString,
  getSigner,
  formatDate,
  getEtherscanLink,
  sanitize,
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
import BalanceTracker from './BalanceTracker.js';
import './HabitatProposalActionList.js';
import './HabitatSentimentSlider.js';

const ISSUE_BODY_CSS = document.createElement('template');
ISSUE_BODY_CSS.innerHTML = `
<style>
* {
  max-width: 100%;
}
</style>
`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  outline: none;
  /* rendering bugs */
  transform: translateZ(0);
}
#title {
  display: block;
  max-width: 25em;
  max-height: 3em;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.2em;
}
#details {
  display: block;
  max-width: 100%;
  max-height: 4em;
  text-overflow: ellipsis;
  overflow: hidden;
  font-weight: lighter;
  font-size: .9em;
  color: var(--color-grey) !important;
}
#details * {
  color: var(--color-grey) !important;
  font-weight: lighter !important;
  overflow: hidden;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  font-size: .9em;
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
  max-height: 0;
  transition: max-height .2s ease-out;
  overflow: hidden;
  -moz-backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.expanded {
  max-height: 100em;
  -webkit-overflow-scrolling: touch;
  overflow-y: scroll;
  overflow-y: overlay;
  transition: max-height .3s ease-in;
}
.indicator,
.indicator #inner,
.indicator #innerRight,
.indicator pin {
  user-select: none;
  -webkit-user-select: none;
}
#indicatorWrapper {
  display: block;
  width: calc(100% - 11em);
  position: relative;
  top: 1.5em;
  margin-top: -1em;
  min-height: 1em;
  min-width: 9em;
}
.indicator {
  display: block;
  width: 100%;
  height: 2em;
  border: none;
  border-radius: 2em;
  background-color: #f0f0f0;
  overflow: hidden;
}
.indicator #inner,
.indicator #innerRight {
  position: relative;
  border: none;
  height: 2em;
  width: 100%;
  box-sizing: border-box;
  transition: all .07s linear;
  background: linear-gradient(90deg, #579D83 0 4%, #6FAA82 4% 16%, #89B981 16% 23%, #99C281 23% 30%, #ADCE80 30% 40%, #CCE080 40% 45%, #D5E37E 45% 53%, #D6D87D 53% 61%, #E1C87B 61% 80%, #E8AF78 67% 80%, #F28F74 80% 93%, #F87972 93% 100%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
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
#drafts,
#subProposals {
  display: grid;
  grid-template-columns: minmax(100%, 1fr);
  gap: 1em;
  padding: 1em 0 0 3em;
}
#drafts > *,
#subProposals > * {
  display: block;
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
.light {
  font-weight: lighter;
  color: var(--color-grey);
}

#infotags {
  display: none;
  position: relative;
  top: -1.2em;
  margin-bottom: -.9em;
}
#infotags > * {
  margin: 0 .5em;
  padding: .5em 1em;
  border-radius: 1em;
  font-size: .7em;
  color: var(--color-bg);
  background-color: var(--color-bg-invert);
}
input[type=number],
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  -moz-appearance: textfield;
}
</style>
<div class='box' style='padding:.5em 2em;'>
  <div id='infotags'></div>
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
      <a href='' id='expand' class='lbl s'>MORE INFO</a>
    </div>

    <a id='id' class='s lbl' style='align-self:start;'> </a>

    <div id='controls' class='flex col' style='padding-top:.2em;'>
      <div id='changeSignal' class='flex col flavor-signal'>
        <div class='flex row'>
          <button id='sub' class='shareBtn left'><span style='vertical-align:text-top;'>-</span></button>
          <input id='inputShares' type='number' placeholder='0'>
          <button id='add' class='shareBtn right'><span style='vertical-align:text-top;'>+</span></button>
        </div>
        <div class='flex col' style='width: 100%; padding-top:.2em;'>
          <habitat-sentiment-slider></habitat-sentiment-slider>
        </div>
      </div>

      <div id='changeBinary' class='flex col flavor-binary'>
        <div class='flex row'>
          <button id='no' class='shareBtn left'><span style='vertical-align:text-top;'>No</span></button>
          <input id='inputShares' type='number' placeholder='0'>
          <button id='yes' class='shareBtn right'><span style='vertical-align:text-top;'>Yes</span></button>
        </div>
        <div class='flex col' style='width: 100%; padding-top:.2em;'>
          <habitat-sentiment-slider></habitat-sentiment-slider>
        </div>
      </div>
    </div>
  </div>

  <div id='indicatorWrapper'>
    <div class='flex row between' style='padding: 0 1em;'>
    <p id='for' class='s light'> </p>
    <p id='against' class='s light'> </p>
    </div>
    <div id='signalIndicator' class='indicator flavor-signal'><div id='inner'></div></div>
    <div id='binaryIndicator' class='indicator flavor-binary'><div id='inner'>YES</div><div id='innerRight'>NO</div></div>
  </div>

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
            <p class='lbl s signal'>Proposer</p>
            <a target='_blank' id='proposer' class='smaller center bold text-center signal'> </a>

            <p class='lbl s signal'>Link</p>
            <a target='_blank' id='externalLink' class='smaller center bold text-center signal'>-</a>

            <p class='lbl s signal'>Participants</p>
            <p id='totalVotes' class='text-center smaller bold signal'></p>

            <p class='lbl s signal'>Total Votes</p>
            <p id='totalShares' class='text-center smaller bold signal'></p>

            <p class='lbl s'>Yes</p>
            <p id='sharesYes' class='smaller center bold text-center'> </p>

            <p class='lbl s'>No</p>
            <p id='sharesNo' class='smaller center bold text-center'> </p>

            <p class='lbl s'>Quorum</p>
            <p id='quorum' class='smaller center bold text-center'> </p>

            <space></space>
            <space></space>
            <p class='lbl s signal'>Your Vote</p>
            <p id='userShares' class='text-center smaller bold signal'></p>

            <p class='lbl s'>Your Signal</p>
            <p id='userSignal' class='text-center smaller bold'></p>
            <space></space>
            <space></space>

            <p class='lbl s signal'>Start Date</p>
            <p id='startDate' class='smaller center bold text-center signal'> </p>

            <p class='lbl s'>End Date</p>
            <p id='endDate' class='smaller center bold text-center'> </p>

            <p class='lbl s signal'>Open Since</p>
            <p id='time' class='smaller center bold text-center signal'> </p>

            <p class='lbl s'>Closes In</p>
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
<div id='drafts'></div>
<div id='subProposals'></div>
`;

class CustomButtonHandler {
  constructor (target, callback) {
    this.callback = callback;
    this.released = true;
    this.velocity = 0;
    this.timestamp = 0;
    this.iter = 0;

    target.addEventListener('mouseup', this, false);
    target.addEventListener('mousedown', this, false);
  }

  handleEvent (evt) {
    return this[evt.type]();
  }

  mousedown () {
    this.released = false;
    this.velocity = 0;
    this.timestamp = 0;
    this.iter = 0;
    this.update();
  }

  mouseup () {
    this.released = true;
    this.update();
  }

  update (now = 0) {
    if (!this.released) {
      window.requestAnimationFrame(this.update.bind(this));
    }

    let threshold = 600;
    if (this.iter > 62) {
      this.velocity += .2;
      threshold = 60;
    } else {
      this.iter++;
    }

    if (now - this.timestamp > threshold) {
      this.timestamp = now;
      const v = ~~this.velocity || 1;
      this.callback(v);
    }
  }
}

const ATTR_HASH = 'hash';
const ATTR_DELEGATE_MODE = 'delegate-mode';
const ATTR_REF_SIGNAL = 'ref-signal';
const ATTR_FLAVOR = 'flavor';
const ATTR_SIGNAL_VAULT = 'signal-vault';
const ATTR_ACTION_VAULT = 'action-vault';
const ATTR_EXPAND = 'expand';

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
      node.addEventListener('change', this.onSignalChange.bind(this), false);
      node.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.target.focus();
        evt.target.select();
      }, false);
      const isSignalContainer = node.parentElement.parentElement.classList.contains('flavor-signal');
      function change (self, v) {
        if (isSignalContainer) {
          const n =  Number(node.value) + v;
          node.value = n;
          self.userSignal = (n - self.cumulativeUserShares) > 0 ? 100 : 0;
        } else {
          self.userSignal = v > 0 ? 100 : 1;
        }
        node.dispatchEvent(new Event('change'));
      }
      new CustomButtonHandler(node.parentElement.querySelector('.right'), (v) => change(this, 1 * v));
      new CustomButtonHandler(node.parentElement.querySelector('.left'), (v) => change(this, -1 * v));
    }
    for (const node of this.shadowRoot.querySelectorAll('habitat-sentiment-slider')) {
      node.addEventListener('change', async (evt) => {
        const { target } = evt;
        const { total } = await BalanceTracker.stat(this.data.token, this.isDelegationMode);
        this.maxBalance = total;
        this.inputShares.value = ~~(this.maxBalance * target.value);
        this.inputShares.dispatchEvent(new Event('change'));
      }, false);
    }

    wrapListener(
      this.shadowRoot.querySelector('#boxleg'),
      () => {
        const e = new HabitatProposeCard();
        e.setAttribute('topic', this.getAttribute(ATTR_HASH));
        e.setAttribute(ATTR_SIGNAL_VAULT, this.getAttribute(ATTR_SIGNAL_VAULT));
        e.setAttribute(ATTR_ACTION_VAULT, this.getAttribute(ATTR_ACTION_VAULT));
        e.setAttribute('proposal-type', this.getAttribute(ATTR_FLAVOR) === 'signal' ? 'Signal' : 'Action');
        this.drafts.append(e);
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

    if (this.hasAttribute(ATTR_EXPAND)) {
      this.toggleExpand();
    }

    onChainUpdate(this.onChainUpdateCallback.bind(this));
  }

  connectedCallback () {
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

  get controls () {
    return this.shadowRoot.querySelector(this.isSignalMode ? '#changeSignal' : '#changeBinary');
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

  get drafts () {
    return this.shadowRoot.querySelector('#drafts');
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

    this.updateSlider();
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

  get totalShares () {
    let ret = this.userVotedShares + this.totalSharesExcludingUser;

    for (const node of this.childProposals) {
      ret += node.totalShares;
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

  get isDelegationMode () {
    return !!this.getAttribute(ATTR_DELEGATE_MODE);
  }

  updateSlider () {
    const e = this.controls.querySelector('habitat-sentiment-slider');
    e.setAttribute('value', this.maxBalance > 0 ? this.userVotedShares / this.maxBalance : 0);
  }

  async onSignalChange (evt) {
    if (!this.data) {
      return;
    }

    const target = evt.target;
    const newValue = Math.max(this.cumulativeUserVotedShares, Number(target.value));
    const old = this.userVotedShares - this.lastVotedShares;
    const { total, available } = await BalanceTracker.stat(this.data.token, this.isDelegationMode);

    if (Math.max(this.cumulativeUserVotedShares, Number(target.value)) !== newValue) {
      console.log('late');
      return;
    }

    this.maxBalance = total;
    this.availableBalance = ~~(available + this.userVotedShares);
    this.userVotedShares = Math.max(0, Math.min(this.availableBalance, newValue - this.cumulativeUserVotedShares));

    const diff = (this.userVotedShares - this.lastVotedShares) - old;
    BalanceTracker.record(this.data.token, this.data.proposalId, this.userVotedShares, this.isDelegationMode);

    target.value = this.userVotedShares + this.cumulativeUserVotedShares;

    if (this.isSignalMode) {
      this.userSignal = this.userVotedShares > 0 ? 100 : 0;
    }

    this.calculateSignal();
    this.dispatchEvent(new Event('signalChange'));
  }

  async onChainUpdateCallback () {
    onChainUpdate(this.onChainUpdateCallback.bind(this));
    await this.update('chainupdatecallback');
  }

  async update () {
    const txHash = this.getAttribute(ATTR_HASH);
    if (!txHash) {
      return;
    }

    let data = await getProposalInformation(txHash);
    if (!data) {
      throw new Error('no such tx:' + txHash);
    }

    {
      // title / link elements
      const titleElement = this.shadowRoot.querySelector('#title');
      titleElement.textContent = data.title;
      this.shadowRoot.querySelector('.expandable #title').textContent = data.title;
      const linkElement = this.shadowRoot.querySelector('#id');
      linkElement.href = data.link;
      linkElement.textContent = 'ID#' +
        data.proposalId.substring(2, 6) + '...' + data.proposalId.substring(data.proposalId.length, data.proposalId.length - 4);

      const html = data.metadata.details || 'no description';
      const article = document.createElement('article');
      article.attachShadow({ mode: 'open' }).append(ISSUE_BODY_CSS.content.cloneNode(true), sanitize(html));
      this.shadowRoot.querySelector('.expandable #body').replaceChildren(article);

      renderLabels(data.metadata.labels || [], this.shadowRoot.querySelector('#labels'));
    }

    data = Object.assign(data, await fetchProposalStats(data));

    this.shadowRoot.querySelector('#totalVotes').textContent =
      `${data.totalVotes} / ${data.participationRate.toFixed(2)}%`;
    this.shadowRoot.querySelector('#totalShares').textContent = `${data.totalShares} ${data.token.symbol}`;
    this.shadowRoot.querySelector('#sharesYes').textContent = `${data.totalYesShares} ${data.token.symbol}`;
    this.shadowRoot.querySelector('#sharesNo').textContent = `${data.totalNoShares} ${data.token.symbol}`;

    if (data.metadata.src) {
      try {
        const e = this.shadowRoot.querySelector('#externalLink');
        e.textContent = (new URL(data.metadata.src)).hostname;
        e.href = data.metadata.src;
      } catch (e) {}
    }
    {
      const proposer = this.shadowRoot.querySelector('#proposer');
      proposer.textContent = renderAddress(data.tx.from);
      proposer.href = getEtherscanLink(data.tx.from);
    }
    if (data.tx.message.internalActions !== '0x' || data.tx.message.externalActions !== '0x') {
      this.shadowRoot.querySelector('#actionContainer').style.display = 'flex';
      this.shadowRoot.querySelector('habitat-proposal-action-list').decode(data.tx.message);
    }

    const { startDate } = data;
    let statusText = '-';
    let openSince = '-';
    let tillClose = '-';
    let endText = 'closed';
    let quorumText = '100%';
    if (data.proposalStatus > VotingStatus.OPEN) {
      openSince = data.proposalStatusText;
      statusText = data.proposalStatusText;

      for (const e of this.shadowRoot.querySelectorAll('#controls button, #controls input')) {
        e.disabled = true;
      }
      this.shadowRoot.querySelector('#processProposal').disabled = true;
      this.shadowRoot.querySelector('#execProposal').disabled =
        data.proposalStats !== VotingStatus.PASSED || data.tx.message.externalActions === '0x';
    } else {
      const simResult = await simulateProcessProposal(
        {
          proposalId: data.proposalId,
          internalActions: data.tx.message.internalActions,
          externalActions: data.tx.message.externalActions,
        }
      );
      const votingDisabled = simResult.votingStatus > VotingStatus.OPEN;
      if (votingDisabled) {
        openSince = 'Proposal Concluded';
      } else {
        const now = ~~(Date.now() / 1000);
        openSince = now >= startDate ? secondsToString(now - startDate) : `starts in ${secondsToString(startDate - now)}`;
      }
      statusText = simResult.statusText;
      tillClose = simResult.secondsTillClose === -1 ? '∞' : secondsToString(simResult.secondsTillClose);
      endText = simResult.secondsTillClose === -1 ? '-' : formatDate((startDate + simResult.secondsTillClose) * 1000);
      quorumText = `${simResult.quorumPercent}%`;

      this.shadowRoot.querySelector('#processProposal').disabled = !votingDisabled;
      this.shadowRoot.querySelector('#execProposal').disabled = true;
    }

    if (this.isSignalMode) {
      this.infoTags.style.display = 'none';
    } else {
      const container = this.infoTags;
      container.innerHTML = '';

      let e = document.createElement('span');
      e.textContent = statusText;
      container.append(e);

      if (tillClose !== '-') {
        e = document.createElement('span');
        e.textContent = `${tillClose} left`;
        container.append(e);
      }

      container.style.display = 'flex';
    }

    // infobox
    this.shadowRoot.querySelector('#startDate').textContent = formatDate(startDate * 1000);
    this.shadowRoot.querySelector('#endDate').textContent = endText;
    this.shadowRoot.querySelector('#tillClose').textContent = tillClose;
    this.shadowRoot.querySelector('#time').textContent = openSince;
    this.shadowRoot.querySelector('#quorum').textContent = quorumText;

    const { flavor } = await getModuleInformation(data.vaultAddress);
    this.render(data);
    this.setAttribute(ATTR_FLAVOR, flavor || 'binary');
  }

  render (data) {
    if (!data) {
      console.warn('data');
      return;
    }

    const oldData = this.data;
    this.data = data;

    const totalShares = this.data.totalShares;
    const isDelegationMode = !!this.getAttribute(ATTR_DELEGATE_MODE);
    let userShares = Number(isDelegationMode ? this.data.delegatedUserShares : this.data.userShares);
    let userSignal = Number(isDelegationMode ? this.data.delegatedUserSignal : this.data.userSignal);

    if (this.data.proposalStatus > VotingStatus.OPEN) {
      // TODO: should give an option to free staked balance
      userShares = 0;
      userSignal = 0;
    }

    if (
      !oldData ||
      this.lastVotedShares !== userShares ||
      this.oldUserSignal !== userSignal ||
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

    this.shadowRoot.querySelector('#userSignal').textContent = `${userSignal}/100`;
    this.shadowRoot.querySelector('#userShares').textContent = `${userShares} ${data.token.symbol}`;

    // will trigger recalculation
    this.shares = this.userVotedShares + this.cumulativeUserVotedShares;
  }

  get changePending () {
    if (this.data && this.data.token) {
      return this.lastVotedShares !== this.userVotedShares || (this.userVotedShares > 0 && this.userSignal !== this.oldUserSignal);
    }
    return false;
  }

  async buildTransactions (delegatedFor) {
    const txs = [];

    if (this.changePending) {
      const signalStrength = this.userVotedShares === 0 ? 0 : this.userSignal;
      const title = this.shadowRoot.querySelector('#title').textContent.substring(0, 10) + '...';
      txs.push(
        {
          primaryType: 'VoteOnProposal',
          message: {
            proposalId: this.data.proposalId,
            signalStrength,
            shares: ethers.utils.parseUnits(this.userVotedShares.toString(), this.data.token.decimals).toHexString(),
            delegatedFor: delegatedFor,
          },
          info: `${delegatedFor === ethers.constants.AddressZero ? 'Vote' : 'Delegated Vote'} on ${title}`,
        }
      );
    }

    for (const node of this.childProposals) {
      txs.push(...(await node.buildTransactions(delegatedFor)));
    }

    return txs;
  }

  renderFlavor (flavor) {
    if (flavor === 'binary') {
      for (const node of this.controls.querySelectorAll('button')) {
        node.classList.remove('bold');
      }
      if (this.userSignal !== 0) {
        this.shadowRoot.querySelector(this.userSignal > 50 ? '#yes' : '#no').classList.add('bold');
      }

      let y = Number(this.data.totalYesShares);
      let n = Number(this.data.totalNoShares);

      if (this.oldUserSignal > 50) {
        y -= this.lastVotedShares;
      } else if (this.oldUserSignal !== 0) {
        n -= this.lastVotedShares;
      }
      if (this.userSignal > 50) {
        y += this.userVotedShares;
      } else if (this.userSignal !== 0) {
        n += this.userVotedShares;
      }
      const totalShares = y + n;
      const accept = totalShares > 0 ? (y * 100) / totalShares : 0;
      const reject = totalShares > 0 ? (n * 100) / totalShares : 0;

      let left = 'calc(100% - 2em)';
      let right = left;
      if (reject || accept) {
        left = `${100 - Math.min(100, accept)}% `;
        right = `${100 - Math.min(100, reject)}%`;
      }
      this.shadowRoot.querySelector('#for').textContent = renderAmount(accept, 0, 1) + '%';
      this.shadowRoot.querySelector('#against').textContent = renderAmount(reject, 0, 1) + '%';
      this.shadowRoot.querySelector('#binaryIndicator #inner').style.paddingRight = left;
      this.shadowRoot.querySelector('#binaryIndicator #innerRight').style.paddingLeft = right;
    } else if (flavor === 'signal') {
      for (const node of this.controls.querySelectorAll('button')) {
        node.classList.remove('bold');
      }
      if (this.userVotedShares > this.lastVotedShares) {
        this.shadowRoot.querySelector('#add').classList.add('bold');
      } else if (this.userVotedShares < this.lastVotedShares) {
        this.shadowRoot.querySelector('#sub').classList.add('bold');
      }

      const e = this.shadowRoot.querySelector('#infobox .b').children;
      for (const node of e) {
        node.style.display = node.classList.contains('signal') ? 'block' : 'none';
      }
    }

    // sort subProposals
    const tmp = [];
    const cards = this.subSignals.children;
    let skip = false;
    let tShares = 0;
    for (const card of cards) {
      if (card.changePending) {
        skip = true;
        break;
      }

      const v = card.totalShares;
      tShares += v;
      tmp.push({ v, card });
    }

    if (!skip) {
      tmp.sort((a, b) => b.v - a.v).forEach(
        function (e, i) {
          e.card.style.gridRow = i + 1;
          e.card.tabIndex = i + 1;
        }
      );
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

  get infoTags () {
    return this.shadowRoot.querySelector('#infotags');
  }
}
customElements.define('habitat-proposal-card', HabitatProposalCard);
