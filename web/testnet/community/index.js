import { checkScroll, wrapListener, renderAddress } from '/lib/utils.js';
import { getProviders, pullEvents } from '/lib/rollup.js';
import { CreateTreasuryFlow } from '/lib/flows.js';

let communityId;

async function renderVault (evt, append = true) {
  const { vaultAddress, condition } = evt.args;
  let metadata;
  try {
    metadata = JSON.parse(evt.args.metadata);
  } catch (e) {
    console.error(e);
  }
  const child = document.createElement('div');
  child.className = 'listitem';
  child.innerHTML = `
    <a href='../vault/#${vaultAddress},${communityId}'></a>
    <sep></sep>
    <label>
    Vault Address
    <input disabled value='${vaultAddress}'>
    </label>
    <label>
    Condition
    <input disabled value='${renderAddress(condition)}'>
    </label>
    `;
  child.querySelector('a').textContent = (metadata ? metadata.title : '') || '???';

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
