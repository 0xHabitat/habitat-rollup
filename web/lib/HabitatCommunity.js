import {
  checkScroll,
  wrapListener,
  renderAddress,
  renderAmount,
  getEtherscanLink,
  getSigner,
  getTokenV2,
} from '/lib/utils.js';
import {
  getProviders,
  getReceipt,
  decodeMetadata,
  pullEvents,
  queryTransfers,
  fetchModuleInformation,
  lookupExecProxyForVault,
  getExecutionProxyContract,
  getMetadataForTopic,
} from '/lib/rollup.js';
import { CreateTreasuryFlow } from '/lib/flows.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import './HabitatTokenAmount.js';

class HabitatCommunity extends HabitatPanel {
  static TEMPLATE =
`
<style>
</style>
<section class='bgwhite'>
  <space></space>
  <div id='buttons' class='flex row center evenly'>
    <habitat-circle tag='Members' id='members'></habitat-circle>
    <habitat-circle tag='TVL' id='tvl'></habitat-circle>
  </div>
  <div id='buttons' class='flex row center evenly'>
    <button class='flow' id='treasury'>Create a Treasury</button>
  </div>
  <space></space>
</section>
<section>
  <div id='vaults' class='flex row evenly center'></div>
</section>
`;

  constructor() {
    super();

    this._loaded = {};
  }

  get title () {
    return super.title || 'Habitat Community';
  }

  // render balances
  async appendInformation (container, vaultAddress) {
    const { habitat } = await getProviders();
    const { tokens } = await queryTransfers(vaultAddress);

    const child = document.createElement('div');
    child.className = 'align-right grid-col';
    child.style.gridTemplateColumns = 'repeat(2, auto)';
    child.style.maxWidth = 'fit-content';
    child.innerHTML = '<habitat-token-amount></habitat-token-amount>'.repeat(tokens.length);
    const children = child.children;
    let childPtr = 0;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const tokenAddr = tokens[i];
      const balance = await habitat.callStatic.getBalance(tokenAddr, vaultAddress);
      children[childPtr].setAttribute('token', tokenAddr);
      children[childPtr].setAttribute('owner', vaultAddress);
      children[childPtr++].setAttribute('amount', balance);
    }

    const sep = document.createElement('div');
    sep.innerHTML = `<p style='color:var(--color-grey)'>${tokens.length ? 'Token Balances' : 'This Treasury owns no Tokens'}</p><sep></sep>`;
    container.appendChild(sep);
    container.appendChild(child);
  }

  async renderVault (evt, append = true) {
    const { vaultAddress, condition } = evt.args;
    const metadata = await getMetadataForTopic(vaultAddress);
    // xxx display information about the module
    const child = document.createElement('div');
    child.className = 'listitem';
    child.innerHTML = `
    <a href='#habitat-vault,${evt.transactionHash}'></a>
    <sep></sep>
    <label>
    Vault Address
    <p>${vaultAddress}</p>
    </label>
    <label>
    Condition
    <p id='conditionName'></p>
    <a class='smaller' target='_blank' href='${getEtherscanLink(condition)}'>${renderAddress(condition)}</a>
    <space></space>
    <p id='conditionDetails' style='max-width:40ch;'></p>
    </label>
    <p class='smaller'>Execution Proxy: <a href='' target='_blank' id='createExecProxy' class=''> </a></p>
    <space></space>
    `;
    child.querySelector('a').textContent = (metadata ? metadata.title : '') || '???';

    // async
    this.appendInformation(child, vaultAddress);

    const conditionMetadata = await fetchModuleInformation(condition);
    if (conditionMetadata) {
      child.querySelector('#conditionName').textContent = conditionMetadata.name || '???';
      if (conditionMetadata.details) {
        child.querySelector('#conditionDetails').textContent = conditionMetadata.details;
      }
    }

    const container = this.shadowRoot.querySelector('#vaults');
    if (append) {
      container.appendChild(child);
    } else {
      container.insertBefore(child, container.firstElementChild);
    }

    const execProxyElement = child.querySelector('#createExecProxy');
    const execProxy = await lookupExecProxyForVault(vaultAddress);
    if (!execProxy) {
      execProxyElement.textContent = 'Create';
      const abortController = new AbortController();
      execProxyElement.addEventListener('click', async (evt) => {
        evt.preventDefault();

        const signer = await getSigner();
        const factoryContract = await getExecutionProxyContract();

        const { habitat } = await getProviders();
        const tx = await factoryContract.connect(signer).createProxy(habitat.address, vaultAddress);
        window.open(getEtherscanLink(tx.hash), '_blank');
        abortController.abort();
        await tx.wait();

        const execProxy = await lookupExecProxyForVault(vaultAddress);
        execProxyElement.href = getEtherscanLink(execProxy);
        execProxyElement.textContent = renderAddress(execProxy);

      }, { signal: abortController.signal });
    } else {
      execProxyElement.href = getEtherscanLink(execProxy);
      execProxyElement.textContent = renderAddress(execProxy);
    }
  }

  async fetchVaults () {
    const { habitat } = await getProviders();
    const filter = habitat.filters.VaultCreated(this.communityId);
    filter.toBlock = await habitat.provider.getBlockNumber();

    checkScroll(
      this.shadowRoot.querySelector('#vaults'),
      async () => {
        for await (const evt of pullEvents(habitat, filter)) {
          await this.renderVault(evt);
        }
      }
    );
  }

  async render () {
    const [, txHash] = this.getAttribute('args').split(',');
    {
      const receipt = await getReceipt(txHash);
      const args = receipt.events[0].args;
      this.communityId = args.communityId;
      this.governanceToken = args.governanceToken;
      const meta = decodeMetadata(receipt.events[1].args.metadata);
      this.setTitle(meta.title);
    }

    wrapListener(
      this.shadowRoot.querySelector('button#treasury'),
      (evt) => {
        new CreateTreasuryFlow(
          evt.target,
          {
            communityId: this.communityId,
            callback: ({ receipt }) => this.renderVault(receipt.events[0], false)
          }
        );
      }
    );

    const { habitat } = await getProviders();
    {
      const totalMembers = Number(await habitat.callStatic.getTotalMemberCount(this.communityId));
      this.shadowRoot.querySelector('habitat-circle#members').setValue(100, totalMembers, totalMembers !== 1 ? 'Members' : 'Member');
    }

    {
      const tkn = await getTokenV2(this.governanceToken);
      const tvl = renderAmount(await habitat.callStatic.getTotalValueLocked(this.governanceToken), tkn.decimals, 0);
      this.shadowRoot.querySelector('habitat-circle#tvl').setValue(100, tvl, 'TVL');
    }
    await this.fetchVaults(this.communityId);
  }
}
customElements.define('habitat-community', HabitatCommunity);
