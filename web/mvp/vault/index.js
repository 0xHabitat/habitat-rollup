import { checkScroll, secondsToString } from '/lib/utils.js';
import { getProviders, pullEvents } from '/lib/rollup.js';

async function fetchProposals (vaultAddress) {
  const { habitat } = await getProviders();
  const blockNum = await habitat.provider.getBlockNumber();
  const filter = habitat.filters.ProposalCreated(vaultAddress);

  filter.toBlock = blockNum;

  const container = document.querySelector('#vaults');
  for await (const evt of pullEvents(habitat, filter, 10)) {
    console.log(evt);
    const { proposalId, startDate, title, actions } = evt.args;
    const child = document.createElement('div');
    child.className = 'listitem';
    console.log({title});
    child.innerHTML = `
      <a href='../proposal/#${proposalId}'></a>
      <sep></sep>
      <p></p>
    `;
    child.querySelector('a').textContent = title;
    const p = child.querySelector('p');
    const now = ~~(Date.now() / 1000);
    if (startDate >= now) {
      p.textContent = `starts in ${secondsToString(startDate - now)}`;
    } else {
      p.textContent = `open since ${secondsToString(now - startDate)}`;
    }
    container.appendChild(child);
  }
}

async function render () {
  const vaultAddress = window.location.hash.replace('#', '');
  await fetchProposals(vaultAddress);
}

window.addEventListener('DOMContentLoaded', render, false);
