import {
  getTokenV2,
  getConfig,
  wrapListener,
  ethers,
  getSigner,
  walletIsConnected,
  renderAmount,
} from '/lib/utils.js';
import {
  doQueryWithOptions,
  getProviders,
  getDelegatedAmountsForToken,
  decodeMetadata,
} from '/lib/rollup.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import './HabitatToggle.js';
import './HabitatProposalCard.js';
import HabitatProposeCard from './HabitatProposeCard.js';

const { HBT, EVOLUTION_SIGNAL_VAULT, EVOLUTION_ACTION_VAULT, EVOLUTION_COMMUNITY_ID } = getConfig();
const VAULTS = {
  [EVOLUTION_SIGNAL_VAULT]: 'Signal',
  [EVOLUTION_ACTION_VAULT]: 'Action',
};

class HabitatEvolution extends HabitatPanel {
  static TEMPLATE =
`
<style>
button {
  margin: 0;
}
#tabs {
}
#tabs > div {
  position: absolute;
  width: calc(100% - var(--panel-padding) * 2);
  transform: rotateY(90deg);
}
#tabs > div.selected {
  transform: none;
}
.light {
  font-weight: 300;
}
#tabnav > div {
  padding-bottom: .5em;
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
#proposals > * {
  width: 100%;
  max-width: 120ch;
  margin: 1em auto;
}
button#submit {
  display: none;
  position: fixed;
  right: 1em;
  top: 50vh;
  z-index: 99;
}
:root, :host {
  --color-bg-button: var(--color-bg);
  --color-button: var(--color-bg-invert);
  --color-border-button: var(--color-bg-invert);
}
:host(.delegateMode) {
  --color-bg-button: var(--color-bg-invert);
  --color-button: var(--color-bg);
  --color-border-button: #a0a0a0;
}
button, .button {
  background-color: var(--color-bg-button);
  color: var(--color-button);
  border-color: var(--color-border-button);
}
.highlightPersonal, .highlightPersonal * {
  background-color: var(--color-button);
  color: var(--color-bg-button);
}
.highlightDelegated, .highlightDelegated * {
  background-color: var(--color-bg-button);
  color: var(--color-button);
}
</style>
<button id='submit' class='s'>Submit</button>
<div style='padding:0 var(--panel-padding);'>
<section>
  <div class='left'>
    <space></space>
    <p class='l'><span><emoji-herb></emoji-herb><span> Evolution of Habitat</span></span></p>
    <space></space>
  </div>

  <div class='flex row center evenly'>
    <div class='box flex col center mtb'>
      <p class='s'>RESERVE</p>
      <p id='totalReserve' class='xl light'> </p>
    </div>

    <div class='box flex col center mtb'>
      <p class='s'>MEMBERS</p>
      <p id='memberCount' class='xl light'> </p>
    </div>

    <div class='box flex col center mtb'>
      <p class='s'>Total Value Locked</p>
      <p id='tvl' class='xl light'> </p>
    </div>

    <div class='flex col left mtb'>
      <div class='box flex col center highlightPersonal'>
        <p class='s'>PERSONAL VOTES</p>
        <p id='personalVotes' class='bold s'> </p>
      </div>
      <space></space>
      <div class='box flex col center highlightDelegated'>
        <p class='s'>DELEGATED VOTES</p>
        <p id='delegatedVotes' class='bold s'> </p>
      </div>
    </div>
  </div>

  <space></space>
  <div class='flex col center'>
    <div id='tabnav' class='flex row evenly'>
      <div id='tab-signal'>
        <p class='l'><span><emoji-sat-antenna></emoji-sat-antenna><span> Community Signals</span></span></p>
      </div>
      <div id='tab-governance'>
        <p class='l'><span><emoji-bank></emoji-bank><span> Rollup Governance</span></span></p>
      </div>
    </div>
    <space></space>
    <p class='s light text-center'>
    Eligendi dolor ipsam quo. Sunt consequatur suscipit dolorem veniam dolorem quia ex nam. Ullam explicabo temporibus ut quos magnam quod aliquid vitae. Reprehenderit tempore deleniti corrupti molestiae dolore. Qui occaecati ut cumque.
    </p>
  </div>

  <space></space>
  <div class='flex row center evenly'>
    <div class='flex row' style='align-items:flex-end;'>
      <habitat-toggle id='delegateModeToggle'></habitat-toggle>
      <p style='margin-left:2em;' class='light'>Delegation Mode</p>
    </div>
  </div>
  <space></space>
</section>

<div id='tabs'>
  <div id='tab-signal' class='tab'>
    <div class='flex row between'>
      <p class='l light'><span><emoji-sat-antenna></emoji-sat-antenna><span> Recent Signals</span></span></p>
      <div>
        <button id='submitTopic' class='s'>+ Submit Topic</button>
      </div>
    </div>
    <space></space>
    <section id='proposals' vault='${EVOLUTION_SIGNAL_VAULT}' class='flex col center'></section>
  </div>

  <div id='tab-governance' class='tab'>
    <div class='flex row between'>
      <p class='l light'><span><emoji-bank></emoji-bank><span> Recent Proposals</span></span></p>
      <div>
        <button id='submitTopic' class='s'>+ Submit Topic</button>
      </div>
    </div>
    <space></space>
    <section id='proposals' vault='${EVOLUTION_ACTION_VAULT}' class='flex col center'></section>
  </div>
</div>
</div>
`;

  constructor() {
    super();

    this.shadowRoot.querySelector('#tabnav #tab-signal').addEventListener('click', () => this.switchTab('tab-signal'), false);
    this.shadowRoot.querySelector('#tabnav #tab-governance').addEventListener('click', () => this.switchTab('tab-governance'), false);
    this.switchTab('tab-signal');

    for (const node of this.shadowRoot.querySelectorAll('#submitTopic')) {
      node.addEventListener('click', () => {
        const e = new HabitatProposeCard();
        e.setAttribute('signal-vault', EVOLUTION_SIGNAL_VAULT);
        e.setAttribute('action-vault', EVOLUTION_ACTION_VAULT);
        e.setAttribute('proposal-type', VAULTS[this.activeTab.querySelector('#proposals').getAttribute('vault')]);
        this.activeTab.querySelector('#proposals').prepend(e);
      }, false);
    }

    wrapListener(this.shadowRoot.querySelector('#submit'), this.submitChanges.bind(this));
    this.shadowRoot.querySelector('#delegateModeToggle').addEventListener('toggle', this.onToggle.bind(this), false);
  }

  switchTab (id) {
    const n = 'selected';
    const tabnav = this.shadowRoot.querySelector('#tabnav');
    for (const node of tabnav.children) {
      if (node.id === id) {
        node.classList.add(n);
        continue;
      }
      node.classList.remove(n);
    }
    for (const node of this.shadowRoot.querySelector('#tabs').children) {
      if (node.id === id) {
        node.classList.add(n);
        this.activeTab = node;
        continue;
      }
      node.classList.remove(n);
    }
  }

  get title () {
    return 'Evolution';
  }

  get currentVault () {
    if (this.activeTab.id === 'tab-signal') {
      return EVOLUTION_SIGNAL_VAULT;
    }
    return EVOLUTION_ACTION_VAULT;
  }

  get delegationMode () {
    return this.classList.contains('delegateMode');
  }

  onToggle () {
    const delegateMode = this.classList.toggle('delegateMode');
    for (const node of this.shadowRoot.querySelectorAll('habitat-proposal-card')) {
      node.setAttribute('delegate-mode', delegateMode || '');
    }
  }

  async render () {
    return this.chainUpdateCallback();
  }

  async chainUpdateCallback () {
    const { habitat } = await getProviders();
    const token = await getTokenV2(HBT);
    const tvl = await habitat.callStatic.getTotalValueLocked(token.address);

    // balances
    {
      let account;
      if (walletIsConnected()) {
        const signer = await getSigner();
        account = await signer.getAddress();
      }

      const userBalance =
        account ? renderAmount(await habitat.callStatic.getBalance(token.address, account), token.decimals) : '-';
      const freeUserBalance =
        account ? renderAmount(await habitat.callStatic.getUnlockedBalance(token.address, account), token.decimals) : '-';
      this.shadowRoot.querySelector('#personalVotes').textContent = `${freeUserBalance}/${userBalance} ${token.symbol}`;

      const { total, used } = account ? await getDelegatedAmountsForToken(token.address, account) : {};
      const delegatedBalance =
        account ? renderAmount(used, token.decimals) : '-';
      const freeDelegatedBalance =
        account ? renderAmount(total, token.decimals) : '-';
      this.shadowRoot.querySelector('#delegatedVotes').textContent = `${freeDelegatedBalance}/${delegatedBalance} ${token.symbol}`;
    }

    // members, votes
    {
      const totalReserve = await habitat.callStatic.getBalance(token.address, EVOLUTION_ACTION_VAULT);
      this.shadowRoot.querySelector('#totalReserve').textContent = `${renderAmount(totalReserve, token.decimals, 1)} ${token.symbol}`;

      const memberCount = await habitat.callStatic.getTotalMemberCount(EVOLUTION_COMMUNITY_ID);
      this.shadowRoot.querySelector('#memberCount').textContent = renderAmount(memberCount);

      this.shadowRoot.querySelector('#tvl').textContent = `${renderAmount(tvl, token.decimals, 1)} ${token.symbol}`;
    }

    // tabs
    {
      const refSignal = ethers.utils.formatUnits(tvl, token.decimals);
      const tabs = this.shadowRoot.querySelector('#tabs');
      const logs = await doQueryWithOptions({ fromBlock: 1, includeTx: true }, 'ProposalCreated', [EVOLUTION_SIGNAL_VAULT, EVOLUTION_ACTION_VAULT]);
      for (const log of logs) {
        const vault = log.args[0];
        const proposals = tabs.querySelector(`[vault="${vault}"]`);
        if (proposals.querySelector(`[hash="${log.transactionHash}"]`)) {
          continue;
        }

        const metadata = decodeMetadata(log.transaction.message.metadata);
        const topic = metadata.topic;
        const e = document.createElement('habitat-proposal-card');
        e.setAttribute('hash', log.transactionHash);
        e.setAttribute('signal-vault', EVOLUTION_SIGNAL_VAULT);
        e.setAttribute('action-vault', EVOLUTION_ACTION_VAULT);
        e.subtopicSupport = !topic;
        e.addEventListener('signalChange', (evt) => {
          this.submitChanges();
        }, false);

        const group = proposals.querySelector(`[hash="${topic}"]`);
        if (group) {
          group.addSubTopic(e);
        } else {
          e.setAttribute('ref-signal', refSignal);
          proposals.prepend(e);
        }
      }
    }
  }

  async submitChanges () {
    let delegatedFor = ethers.constants.AddressZero;
    if (this.delegationMode) {
      const signer = await getSigner();
      delegatedFor = await signer.getAddress();
    }

    const batch = [];
    for (const node of this.shadowRoot.querySelectorAll('habitat-proposal-card')) {
      batch.push(...(await node.buildTransactions(delegatedFor)));
    }
    // dispatch (to sidebar)
    window.postMessage({ type: 'hbt-tx-bundle', value: batch }, window.location.origin);
  }
}
customElements.define('habitat-evolution', HabitatEvolution);
