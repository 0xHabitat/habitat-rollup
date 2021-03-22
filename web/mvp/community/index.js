import { checkScroll } from '/lib/utils.js';
import { getProviders, pullEvents } from '/lib/rollup.js';

async function fetchVaults (communityId) {
  const { habitat } = await getProviders();
  const blockNum = await habitat.provider.getBlockNumber();
  const filter = habitat.filters.VaultCreated(communityId);

  filter.toBlock = blockNum;

  //checkScroll(() => console.warn('pull more'));

  const container = document.querySelector('#vaults');
  for await (const evt of pullEvents(habitat, filter, 10)) {
    const { vaultAddress, condition } = evt.args;
    let metadata;
    try {
      //metadata = JSON.parse(evt.args.metadata);
    } catch (e) {
      console.error(e);
    }
    const child = document.createElement('div');
    child.className = 'listitem';
    child.innerHTML = `
      <a href='../vault/#${vaultAddress}'></a>
      <sep></sep>
      <label>
      Vault Address
      <input disabled value='${vaultAddress}'>
      </label>
      <label>
      Condition
      <input disabled value='${condition}'>
      </label>
    `;
    child.querySelector('a').textContent = (metadata ? metadata.title : '') || '???';
    container.appendChild(child);
  }
}

async function render () {
  // a community has vaults, proposals
  const communityId = window.location.hash.replace('#', '');
  await fetchVaults(communityId);
}

window.addEventListener('DOMContentLoaded', render, false);
