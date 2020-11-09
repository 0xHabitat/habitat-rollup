import { formatObject, computeVotePercentages, secondsToHms } from './common/utils.js';
import { getProviders } from './common/tx.js';

async function render () {
  const { habitat } = await getProviders();
  const pendingContainer = document.querySelector('.pending');
  const proposedContainer = document.querySelector('.proposed');
  // TODO: calculate current period in seconds and display voting time left
  const currentPeriod = await habitat.getCurrentPeriod();
  const votingPeriodLength = await habitat.votingPeriodLength();
  const periodDuration = await habitat.periodDuration();

  async function renderProposal (evt, args) {
    const proposalIndex = args.proposalIndex.toString()
    const proposal = await habitat.proposalQueue(proposalIndex);
    const title = args.title;
    const description = title.length > 24 ? title.substring(0, 21) + '...' : title;
    const { yay, nay } = computeVotePercentages(proposal);

    const expired = await habitat.hasVotingPeriodExpired(proposal.startingPeriod);
    const lengthInSeconds = (((+proposal.startingPeriod)+(+votingPeriodLength))-(+currentPeriod))*(+periodDuration);

    let status = expired ? 'Voting Ended' : secondsToHms(lengthInSeconds);
    if (proposal.aborted) {
      status = '❌';
    } else if (proposal.didPass || proposal.processed) {
      status = '✅';
    }

    const ele = document.createElement('div');
    ele.className = 'listitem';
    ele.appendChild(
      formatObject(
        {
          id: proposalIndex,
          status,
          title: description,
          yay: `${(yay * 100).toFixed(2)} % 👍`,
          nay: `${(nay * 100).toFixed(2)} % 👎`,
        },
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

  async function pull () {
    if (filter.toBlock === 0) {
      return;
    }

    filter.fromBlock = filter.toBlock - 1;

    if (filter.fromBlock < 1) {
      filter.fromBlock = 1;
    }

    const logs = await habitat.provider.send('eth_getLogs', [filter]);
    for (const log of logs.reverse()) {
      const evt = habitat.interface.parseLog(log);

      await renderProposal(log, evt.values);
    }
    filter.toBlock = filter.fromBlock - 1;
  }

  {
    // calculates scroll position and pulls more (older) proposals if needed
    const wrapper = document.querySelector('.wrapperContent');
    async function _check () {
      const fetchMore =
        (wrapper.scrollHeight < window.screen.height)
        || (wrapper.scrollHeight - wrapper.scrollTop) < window.screen.height;

      if (fetchMore) {
        try {
          await pull();
        } catch (e) {
          console.log(e);
        }
      }

      window.requestAnimationFrame(_check);
    }
    _check();
  }
}

window.addEventListener('DOMContentLoaded', render, false);
