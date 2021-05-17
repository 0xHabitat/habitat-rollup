import {
  wrapListener,
  getEtherscanLink,
  getEtherscanTokenLink,
  secondsToString,
  renderAmount,
  walletIsConnected,
  getTokenSymbol,
  getToken,
  ethers,
} from '/lib/utils.js';
import {
  getProviders,
  sendTransaction,
  decodeExternalProposalActions,
  decodeInternalProposalActions,
  executeProposalActions,
  formatObject,
  humanProposalTime,
  getUsername,
  fetchProposalStats,
  VotingStatus,
  simulateProcessProposal,
  fetchIssue,
  renderLabels,
} from '/lib/rollup.js';

const CIRCLES = `
<habitat-circle class='signal' id='participation' tag='Participation'></habitat-circle>
<habitat-circle id='votes' tag='Votes'></habitat-circle>
<habitat-circle class='signal' id='shares' tag='Shares'></habitat-circle>
`;

let communityId, proposalId, proposer, tx;

async function processProposal (proposalId, originTx) {
  const args = {
    proposalId,
    internalActions: originTx.message.internalActions,
    externalActions: originTx.message.externalActions,
  };

  await sendTransaction('ProcessProposal', args);
  await updateProposal();
}

async function executeProposal (proposalId, actionBytes) {
  const tx = await executeProposalActions(proposalId, actionBytes);
  // lazy :)
  window.location.href = getEtherscanLink(tx.hash);
}

async function updateProposal () {
  const { habitat } = await getProviders();
  const {
    totalShares,
    defaultSliderValue,
    signals,
    signalStrength,
    userShares,
    userSignal,
    totalVotes,
    participationRate,
    tokenSymbol,
    proposalStatus,
  } = await fetchProposalStats({ communityId, proposalId });
  const votingDisabled = proposalStatus.gt(VotingStatus.OPEN);
  const status = votingDisabled ? 'Proposal Concluded' : humanProposalTime(tx.message.startDate);
  const { internalActions, externalActions } = tx.message;
  const { votingStatus, secondsTillClose } = await simulateProcessProposal({ proposalId, internalActions, externalActions });
  const tillClose = secondsTillClose === -1 ? '∞' : secondsToString(secondsTillClose);

  document.querySelector('#finalize').disabled = !(votingStatus > VotingStatus.OPEN);
  document.querySelector('#execProposal').disabled = !(proposalStatus.eq(VotingStatus.PASSED) && tx.message.externalActions !== '0x');

  // some metadata below the proposal
  {
    const obj = {
      id: proposalId,
      status,
      proposer,
      'Closes in': tillClose,
    };

    const container = document.querySelector('#proposalStats');
    const ele = formatObject(obj);
    ele.className = 'grid-2';
    container.innerHTML = '';
    container.appendChild(ele);
  }

  // statistics
  {
    const circles = document.querySelector('#circles');
    circles.innerHTML = CIRCLES;
    circles.querySelector('#participation').setValue(participationRate, `${participationRate.toFixed(2)}%`);
    circles.querySelector('#votes').setValue(100, totalVotes, totalVotes !== 1 ? 'Votes' : 'Vote');
    circles.querySelector('#shares').setValue(signalStrength, renderAmount(totalShares), totalShares !== 1 ? 'Shares' : 'Share');
  }

  document.querySelector('habitat-voting-sub').update({ proposalId, vault: tx.message.vault });
}

async function render () {
  const { habitat } = await getProviders();
  const proposalTxHash = window.location.hash.replace('#', '');
  tx = await habitat.provider.send('eth_getTransactionByHash', [proposalTxHash]);
  const receipt = await habitat.provider.send('eth_getTransactionReceipt', [proposalTxHash]);
  const proposalEvent = habitat.interface.parseLog(receipt.logs[0]);
  proposer = await getUsername(receipt.from);
  console.log({tx,receipt});
  let metadata = {};
  try {
    metadata = JSON.parse(tx.message.metadata);
  } catch (e) {
    console.warn(e);
  }

  communityId = await habitat.communityOfVault(tx.message.vault);
  proposalId = proposalEvent.args.proposalId;

  document.querySelector('#visitVault').href = `../vault/#${tx.message.vault},${communityId}`;
  {
    renderLabels(metadata.labels || [], document.querySelector('#labels'));

    const titleElement = document.querySelector('#title');
    const bodyElement = document.querySelector('#proposal');

    titleElement.textContent = metadata.title || '<no title>';
    // proposal body
    if (metadata.src) {
      try {
        const issue = await fetchIssue(metadata.src);
        // xxx: consider using an iframe for embedding
        bodyElement.innerHTML = issue.body_html;
        // update title
        titleElement.textContent = issue.title;

        // add link to issue
        const link = document.createElement('a');
        link.target = '_blank';
        link.href = metadata.src;
        link.className = 'button secondary purple smaller';
        link.textContent = metadata.src;
        document.querySelector('#container').insertBefore(link, bodyElement.parentElement);
      } catch (e) {
        console.warn(e);
      }
    } else {
      const details = metadata.details || '<no information>';
      bodyElement.textContent = details;
    }
  }

  const internalActions = decodeInternalProposalActions(tx.message.internalActions);
  const externalActions = decodeExternalProposalActions(tx.message.externalActions);
  {
    const grid = document.querySelector('.proposalActions');
    grid.innerHTML = '<p></p><a target="_blank"></a><p></p>'.repeat(internalActions.length + externalActions.length);
    const childs = grid.children;
    let childPtr = 0;

    for (let i = 0, len = externalActions.length; i < len;) {
      const contractAddress = externalActions[i++];
      const calldata = externalActions[i++];

      // type
      childs[childPtr++].textContent = 'On-chain Contract call';
      // address
      childs[childPtr].textContent = contractAddress;
      childs[childPtr++].href = getEtherscanLink(contractAddress);
      // calldata
      childs[childPtr++].textContent = calldata;
    }

    for (let i = 0, len = internalActions.length; i < len;) {
      const action = internalActions[i++];
      // type
      childs[childPtr++].textContent = action.type;
      // xxx check if token is nft
      const erc = await getToken(action.token);
      childs[childPtr].href = getEtherscanTokenLink(erc.address);
      childs[childPtr++].textContent = `${renderAmount(action.value, erc._decimals)} ${await getTokenSymbol(erc.address)}`;
      childs[childPtr++].textContent = action.receiver;
    }
  }

  {
    wrapListener('habitat-voting-sub', async () => {
      await updateProposal();
    }, 'update');
    wrapListener('button#finalize', () => processProposal(proposalId, tx));

    // any actions we can execute?
    // TODO: calculate estimate of bridge finalization time
    if (externalActions.length) {
      wrapListener('button#execProposal', () => executeProposal(proposalId, tx.message.externalActions));
    }
  }

  await updateProposal();
  setInterval(updateProposal, 10000);
}

window.addEventListener('DOMContentLoaded', render, false);
