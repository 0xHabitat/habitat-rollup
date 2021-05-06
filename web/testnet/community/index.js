import {
  checkScroll,
  wrapListener,
  renderAddress,
  renderAmount,
  getEtherscanTokenLink,
  getEtherscanLink,
  getErc20,
  getTokenName,
} from '/lib/utils.js';
import { getProviders, pullEvents, queryTransfers, fetchModuleInformation } from '/lib/rollup.js';
import { CreateTreasuryFlow } from '/lib/flows.js';

let communityId;

// render balances
async function appendInformation (container, vaultAddress) {
  const { habitat } = await getProviders();
  const { tokens } = await queryTransfers(vaultAddress);

  const child = document.createElement('div');
  child.className = 'align-right grid-col';
  child.style.gridTemplateColumns = 'repeat(2, auto)';
  child.style.maxWidth = 'fit-content';
  child.innerHTML = '<p></p><a></a>'.repeat(tokens.length);
  const children = child.children;
  let childPtr = 0;
  for (let i = 0, len = tokens.length; i < len; i++) {
    const token = tokens[i];
    const erc = await getErc20(token);
    const balance = await habitat.getBalance(token, vaultAddress);
    const tokenName = await getTokenName(token);
    children[childPtr++].textContent = renderAmount(balance, erc._decimals);
    children[childPtr].textContent = erc._symbol;
    children[childPtr++].href = getEtherscanTokenLink(token, vaultAddress);
  }

  const sep = document.createElement('div');
  sep.innerHTML = `<p style='color:var(--color-grey)'>${tokens.length ? 'Token Balances' : 'This Treasury owns no Tokens'}</p><sep></sep>`;
  container.appendChild(sep);
  container.appendChild(child);
}

async function renderVault (evt, append = true) {
  const { vaultAddress, condition } = evt.args;
  let metadata;
  try {
    metadata = JSON.parse(evt.args.metadata);
  } catch (e) {
    console.error(e);
  }
  // xxx display information about the module
  const child = document.createElement('div');
  child.className = 'listitem';
  child.innerHTML = `
    <a href='../vault/#${vaultAddress},${communityId}'></a>
    <sep></sep>
    <label>
    Vault Address
    <p>${vaultAddress}</p>
    </label>
    <label>
    Condition
    <p id='conditionName'></p>
    <a class='smaller' target='_blank' href='${getEtherscanLink(condition)}'>${renderAddress(condition)}</a>
    </label>
    `;
  child.querySelector('a').textContent = (metadata ? metadata.title : '') || '???';

  // async
  appendInformation(child, vaultAddress);

  const conditionMetadata = await fetchModuleInformation(condition);
  if (conditionMetadata) {
    child.querySelector('#conditionName').textContent = conditionMetadata.name || '???';
  }

  const container = document.querySelector('#vaults');
  if (append) {
    container.appendChild(child);
  } else {
    container.insertBefore(child, container.firstElementChild);
  }
}

async function fetchVaults () {
  const { habitat } = await getProviders();
  const filter = habitat.filters.VaultCreated(communityId);
  filter.toBlock = await habitat.provider.getBlockNumber();

  checkScroll(
    '#vaults',
    async function () {
      for await (const evt of pullEvents(habitat, filter)) {
        await renderVault(evt);
      }
    }
  );
}

async function update ({ receipt }) {
  const [evt] = receipt.events;
  await renderVault(evt, false);
};

async function render () {
  communityId = window.location.hash.replace('#', '');
  wrapListener('button#treasury', (evt) => new CreateTreasuryFlow(evt.target, { communityId, callback: update }));

  const { habitat } = await getProviders();
  const totalMembers = Number(await habitat.getTotalMemberCount(communityId));
  document.querySelector('habitat-circle#members').setValue(100, totalMembers, totalMembers !== 1 ? 'Members' : 'Member');
  await fetchVaults(communityId);
}

window.addEventListener('DOMContentLoaded', render, false);
