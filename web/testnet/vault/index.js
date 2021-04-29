import { wrapListener, checkScroll, secondsToString, renderAmount } from '/lib/utils.js';
import {
  getProviders,
  pullEvents,
  fetchProposalStats,
  humanProposalTime,
  submitVote,
  VotingStatus,
} from '/lib/rollup.js';
import '/lib/HabitatProposal.js';

async function fetchProposals (vaultAddress) {
  const { habitat } = await getProviders();
  const filter = habitat.filters.ProposalCreated(vaultAddress);
  filter.toBlock = await habitat.provider.getBlockNumber();

  const container = document.querySelector('#proposals');
  for await (const evt of pullEvents(habitat, filter)) {
    const child = document.createElement('habitat-proposal');
    child.update(evt);
    container.appendChild(child);
  }
}

async function render () {
  const [vaultAddress, communityId] = window.location.hash.replace('#', '').split(',');
  document.querySelector('a#propose').href = `../propose/#${vaultAddress},${communityId}`;
  document.querySelector('a#back').href = `../community/#${communityId}`;
  await fetchProposals(vaultAddress);
}

window.addEventListener('DOMContentLoaded', render, false);
