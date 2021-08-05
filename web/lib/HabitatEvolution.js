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
  getReceipt,
  fetchModuleInformation,
  getTotalDelegatedAmountForToken,
} from '/lib/rollup.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import './HabitatToggle.js';
import './HabitatProposalCard.js';
import './HabitatTransactionCart.js';
import HabitatProposeCard from './HabitatProposeCard.js';
import { setupTabs } from './tabs.js';

const { HBT, EVOLUTION_SIGNAL_VAULT, EVOLUTION_ACTION_VAULT, EVOLUTION_COMMUNITY_ID } = getConfig();

class HabitatEvolution extends HabitatPanel {
  static TEMPLATE =
`
<style>
button {
  margin: 0;
}
.light {
  font-weight: 300;
}
#tabs > div {
  height: 0;
  opacity: 0;
  transform: rotateY(90deg);
  -moz-backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
#tabs > div.selected {
  height: auto;
  opacity: 1;
  transform: none;
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
.proposals {
  display: grid;
  grid-template-columns: minmax(100%, 1fr);
}
#draft > *,
.proposals > * {
  width: 100%;
  margin: 1em auto;
}
:root, :host {
  --color-bg-button: var(--color-bg);
  --color-button: var(--color-bg-invert);
  --color-border-button: var(--color-bg-invert);
}
.delegateMode {
  --color-bg-button: var(--color-bg-invert);
  --color-button: var(--color-bg);
  --color-border-button: #a0a0a0;
}
button, .button {
  background-color: var(--color-bg-button);
  color: var(--color-button);
  border-color: var(--color-border-button);
}
.highlightDelegated, .highlightDelegated * {
  background-color: var(--color-button);
  color: var(--color-bg-button);
}
#recentSignal,
#topSignal {
  display: none;
  padding-bottom: 1em;
}
#sticky {
  position: sticky;
  top: .5em;
  max-width: max-content;
  padding: .5em 1em;
  border-radius: 2em;
  background-color: var(--color-bg);
  border: 1px solid var(--color-bg-invert);
  z-index: 9;
}
#tabs * {
  outline: none;
}
</style>
<div style='padding:0 var(--panel-padding);'>
  <div style='margin: 0 auto;width:60em;max-width:100%;'>
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
          <div class='box flex col center'>
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
      </div>
    </section>

       <div id='sticky' class='flex row center evenly'>
        <div class='flex row'>
          <habitat-toggle
            id='delegateModeToggle'
            left='Personal Mode'
            tooltip-left='Your personal voting power'
            right='Delegation Mode'
            tooltip-right='Voting power delegated to you'
          ></habitat-toggle>
          <habitat-transaction-cart></habitat-transaction-cart>
        </div>
      </div>

    <div id='tabs'>
      <div id='tab-signal' class='tab'>
        <div class='flex'>
          <p class='light center'>
Help Habitat grow and express your preferences. This area is about signaling your priority by adding HBT votes on single topics and their subtopics. To submit a new topic you need to hold at least 0.001% of the TVL of HBT.
          </p>
        </div>
        <div class='flex row between'>
          <span></span>
          <div>
            <button id='submitTopic' class='s'>+ Submit Topic</button>
          </div>
        </div>
        <section id='draft' class='flex col center'></section>
        <section id='proposals' class='center proposals'>
          <p id='recentSignal' class='l light'><span><emoji-sat-antenna></emoji-sat-antenna><span> Recent Signals</span></span></p>
          <p id='topSignal' class='l light'><span><emoji-sat-antenna></emoji-sat-antenna><span> Top Signals</span></span></p>
        </section>
      </div>

      <div id='tab-governance' class='tab'>
        <div class='flex'>
          <p class='light center'>
Vote on important rollup governance decisions with HBT tokens. Info: 7 day voting period with a 10% quorum of TVL (HBT) needed to pass. To submit a proposal you need to own 0.1% of HBT on the rollup (TVL).
          </p>
        </div>
        <div class='flex row between'>
          <span></span>
          <div>
            <button id='submitTopic' class='s'>+ Submit Proposal</button>
          </div>
        </div>
        <section id='draft' class='flex col center'></section>
        <section id='proposals' class='flex col center proposals'>
          <p id='recentSignal' class='l light'><span><emoji-bank></emoji-bank><span> Recent Proposals</span></span></p>
          <p id='topSignal' class='l light'><span><emoji-bank></emoji-bank><span> Proposals</span></span></p>
        </section>
      </div>
    </div>
  </div>
</div>
`;

  constructor() {
    super();

    setupTabs(this.shadowRoot, (node) => {
      this.activeTab = node;
    });

    for (const node of this.shadowRoot.querySelectorAll('#submitTopic')) {
      node.addEventListener('click', () => {
        const e = new HabitatProposeCard();
        e.setAttribute('signal-vault', this.signalVault);
        e.setAttribute('action-vault', this.actionVault);
        e.setAttribute('proposal-type', this.vaults[this.activeTab.querySelector('#proposals').getAttribute('vault')]);
        this.activeTab.querySelector('#draft').prepend(e);
      }, false);
    }

    this.shadowRoot.querySelector('#delegateModeToggle').addEventListener('toggle', this.onToggle.bind(this), false);
  }

  get title () {
    return 'Evolution';
  }

  get currentVault () {
    if (this.activeTab.id === 'tab-signal') {
      return this.signalVault;
    }
    return this.actionVault;
  }

  get tabs () {
    return this.shadowRoot.querySelector('#tabs');
  }

  get delegationMode () {
    return this.tabs.classList.contains('delegateMode');
  }

  onToggle () {
    const delegateMode = this.tabs.classList.toggle('delegateMode');
    for (const node of this.shadowRoot.querySelectorAll('habitat-proposal-card')) {
      node.setAttribute('delegate-mode', delegateMode || '');
    }
  }

  async render () {
    const [, txHash] = this.getAttribute('args').split(',');
    if (txHash) {
      const receipt = await getReceipt(txHash);
      const { communityId } = receipt.events[0].args;

      this.communityId = communityId;
      this.vaults = {};

      for (const log of await doQueryWithOptions({ toBlock: 1 }, 'VaultCreated', communityId)) {
        const info = await fetchModuleInformation(log.args.condition);
        const flavor = info.flavor || 'binary';
        this.vaults[log.args.vaultAddress] = flavor;
      }

      // TODO
      const vaults = Object.keys(this.vaults);
      this.actionVault = vaults[0];
      this.signalVault = vaults[1];
    } else {
      this.vaults = {
        [EVOLUTION_SIGNAL_VAULT]: 'Signal',
        [EVOLUTION_ACTION_VAULT]: 'Action',
      };
      this.actionVault = EVOLUTION_ACTION_VAULT;
      this.signalVault = EVOLUTION_SIGNAL_VAULT;
    }

    this.shadowRoot.querySelector('#tab-governance #proposals').setAttribute('vault', this.actionVault);
    this.shadowRoot.querySelector('#tab-signal #proposals').setAttribute('vault', this.signalVault);

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

      let usedUserBalance = '-';
      let userBalance = usedUserBalance;
      let usedDelegatedBalance = usedUserBalance;
      let delegatedBalance = usedUserBalance;

      if (account) {
        const delegated = await getTotalDelegatedAmountForToken(token.address, account);
        const totalUserBalance = (await habitat.callStatic.getBalance(token.address, account)).sub(delegated);
        const voted = await habitat.callStatic.getActiveVotingStake(token.address, account);
        userBalance = renderAmount(totalUserBalance, token.decimals);
        usedUserBalance = renderAmount(voted, token.decimals);

        const { total, used } = await getDelegatedAmountsForToken(token.address, account);
        delegatedBalance = renderAmount(total, token.decimals);
        usedDelegatedBalance = renderAmount(used, token.decimals);
      }

      this.shadowRoot.querySelector('#personalVotes').textContent = `${usedUserBalance}/${userBalance} ${token.symbol}`;
      this.shadowRoot.querySelector('#delegatedVotes').textContent = `${usedDelegatedBalance}/${delegatedBalance} ${token.symbol}`;
    }

    // members, votes
    {
      const totalReserve = await habitat.callStatic.getBalance(token.address, this.actionVault);
      this.shadowRoot.querySelector('#totalReserve').textContent = `${renderAmount(totalReserve, token.decimals, 1)} ${token.symbol}`;

      const memberCount = await habitat.callStatic.getTotalMemberCount(EVOLUTION_COMMUNITY_ID);
      this.shadowRoot.querySelector('#memberCount').textContent = renderAmount(memberCount);

      this.shadowRoot.querySelector('#tvl').textContent = `${renderAmount(tvl, token.decimals, 1)} ${token.symbol}`;
    }

    // tabs
    {
      const refSignal = ethers.utils.formatUnits(tvl, token.decimals);
      const tabs = this.shadowRoot.querySelector('#tabs');
      const delegateMode = tabs.classList.contains('delegateMode');
      const logs = await doQueryWithOptions({ fromBlock: 1, includeTx: true }, 'ProposalCreated', [this.signalVault, this.actionVault]);
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
        e.setAttribute('signal-vault', this.signalVault);
        e.setAttribute('action-vault', this.actionVault);
        e.setAttribute('delegate-mode', delegateMode || '');
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
    const cards = this.shadowRoot.querySelectorAll('habitat-proposal-card');
    for (const node of cards) {
      batch.push(...(await node.buildTransactions(delegatedFor)));
    }

    for (const tab of this.shadowRoot.querySelectorAll('.tab')) {
      const topSignals = [];
      const cards = tab.querySelectorAll('habitat-proposal-card');
      let tShares = 0;
      for (const card of cards) {
        const v = card.totalShares;
        tShares += v;
        topSignals.push({ v, card });
      }
      for (const card of cards) {
        card.setAttribute('ref-signal', tShares);
      }
      if (batch.length === 0) {
        const topSignal = tab.querySelector('#topSignal');
        const recentSignal = tab.querySelector('#recentSignal');
        const now = ~~(Date.now() / 1000);
        // 24 hrs (seconds)
        const threshold = 86400;

        topSignals.sort(
          function (a, b) {
            const aT = a.card.data.startDate;
            const bT = b.card.data.startDate;
            if (now - aT < threshold || now - bT < threshold) {
              return bT > aT ? 1 : -1;
            }

            const aStatus = a.card.data.proposalStatus;
            const bStatus = b.card.data.proposalStatus;
            if (aStatus > 1 || bStatus > 1) {
              return bStatus > aStatus ? -1 : 1;
            }

            return b.v - a.v;
          }
        );
        topSignal.style.display = 'none';
        recentSignal.style.display = 'none';

        let uTop = true;
        let uRecent = true;
        let pos = 0;
        let tabIndex = 0;
        for (const e of topSignals) {
          if (now - e.card.data.startDate > threshold) {
            if (uTop) {
              uTop = false;
              topSignal.style.gridRow = ++pos;
              topSignal.style.display = 'block';
            }
          } else {
            if (uRecent) {
              uRecent = false;
              recentSignal.style.gridRow = ++pos;
              recentSignal.style.display = 'block';
            }
          }

          e.card.style.gridRow = ++pos;
          e.card.tabIndex = ++tabIndex;
        }
      }
    }

    // dispatch (to sidebar)
    window.postMessage({ type: 'hbt-tx-bundle', value: batch }, window.location.origin);
  }
}
customElements.define('habitat-evolution', HabitatEvolution);
