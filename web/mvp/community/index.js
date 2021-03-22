import { getProviders } from '/lib/rollup.js';

async function fetchProposals () {
  const pendingContainer = document.querySelector('.pending');
  const proposedContainer = document.querySelector('.proposed');

  // TODO: calculate current period in seconds and display voting time left
  const currentPeriod = await habitat.getCurrentPeriod();
  const votingPeriodLength = await habitat.votingPeriodLength();
  const periodDuration = await habitat.periodDuration();
  const totalShares = await habitat.totalShares();

  async function renderProposal (evt, args) {
    const proposalIndex = args.proposalIndex.toString()
    const proposal = await habitat.proposalQueue(proposalIndex);
    const title = args.title;
    const description = title.length > 24 ? title.substring(0, 21) + '...' : title;
    const { yay, nay, participationRate } = computeVotePercentages(proposal, totalShares);

    const expired = await habitat.hasVotingPeriodExpired(proposal.startingPeriod);
    const lengthInSeconds = (((+proposal.startingPeriod)+(+votingPeriodLength))-(+currentPeriod))*(+periodDuration);

    let status = expired ? 'Voting Ended' : secondsToHms(lengthInSeconds);
    if (proposal.aborted) {
      status = '❌';
    } else if (proposal.didPass || proposal.processed) {
      status = '✅';
    }

    const obj = {
      id: proposalIndex,
      status,
      title: description,
      yay: `${(yay * 100).toFixed(2)} % 👍`,
      nay: `${(nay * 100).toFixed(2)} % 👎`,
    };

    if (!expired) {
      obj['Participation Rate'] =  `${(participationRate * 100).toFixed(2)} %`;
    }

    const ele = document.createElement('div');
    ele.className = 'listitem';
    ele.appendChild(
      formatObject(
        obj,
        `/proposal/#${evt.transactionHash}`
      )
    );

    if (proposal.processed) {
      proposedContainer.appendChild(ele);
    } else {
      pendingContainer.appendChild(ele);
    }
  }

  const blockNum = await habitat.provider.getBlockNumber();
  const filter = habitat.filters.SubmitProposal();
  filter.toBlock = blockNum;
}

async function render () {
  // a community has vaults, proposals
  const communityId = window.location.hash.replace('#', '');
  alert(communityId);
}

window.addEventListener('DOMContentLoaded', render, false);
