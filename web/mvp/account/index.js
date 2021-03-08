import { ERC20_ABI } from '../common/constants.js';
import { formatObject, wrapListener, alertModal } from '../common/utils.js';
import { WithdrawFlow, DepositFlow, RagequitFlow } from '../common/flows.js';
import { getProviders, getSigner } from '../common/tx.js';

async function getStats () {
  const signer = await getSigner();
  const { habitat, rootProvider } = await getProviders();
  const bridge = habitat.connect(rootProvider);
  const signerAddress = await signer.getAddress();
  const { delegateKey, shares, exists, highestIndexYesVote } = await habitat.members(signerAddress);
  const tokenAddress = await habitat.approvedToken();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, rootProvider);
  const decimals = await token.decimals();
  const balanceL1 = ethers.utils.formatUnits(await token.balanceOf(signerAddress), decimals);
  const tokenSymbol = await token.symbol();
  // TODO: inform the user about pending exits
  const availableForExit = ethers.utils.formatUnits(await bridge.getERC20Exit(tokenAddress, signerAddress), decimals);
  let totalShares = await habitat.totalShares();

  if (totalShares.eq(0)) {
    totalShares = totalShares.add(1);
  }

  return {
    'Token adress': tokenAddress,
    'Token balance in your Wallet': `${balanceL1} ${tokenSymbol}`,
    'Your shares on Habitat': ethers.utils.formatUnits(shares, decimals),
    'Delegated account address': delegateKey,
    'Shares available to Withdraw': availableForExit,
    'Your Voting Power': `${shares.mul(100).div(totalShares).toString()} % of total locked shares`,
  };
}

async function render () {
  if (!window.ethereum) {
    const btn = document.createElement('button');
    btn.innerText = 'Connect Wallet';
    btn.addEventListener(
      'click',
      async function () {
        try {
          if (!window.ethereum) {
            throw new Error('No Ethereum Wallet detected');
            return;
          }

          await render();
          btn.remove();
        } catch (e) {
          alertModal(e.toString());
        }
      },
      false
    );
    document.querySelector('.wallet').appendChild(btn);
    return;
  }

  // stats
  {
    const container = document.querySelector('.wallet');
    const stats = await getStats();
    const statContainer = formatObject(stats);

    statContainer.className = 'grid2 stats';
    container.appendChild(statContainer);
  }

  // interactive stuff
  // L1
  {
    // deposit
    wrapListener('button#deposit', (evt) => new DepositFlow(evt.target));
    // withdraw
    wrapListener('button#withdraw', (evt) => new WithdrawFlow(evt.target));
  }

  // L2
  {
    // ragequit
    wrapListener('button#exit', (evt) => new RagequitFlow(evt.target));
    // TODO: setDelegateKey...
  }

  {
    // TODO: list of proposals by this member and/or the delegate
    /*
    const myProposals = document.querySelector('.myProposals');
    const signer = await getSigner();
    const signerAddress = await signer.getAddress();
    const { habitat } = await getProviders();
    habitat.on(habitat.filters.SubmitProposal(null, signerAddress, signerAddress),
      function (proposalIndex) {
        console.log(proposalIndex);
      }
    );
    habitat.provider.resetEventsBlock(1);
    */
  }
}

async function errorWrapper () {
  try {
    await this();
  } catch (e) {
    alertModal(e);
  }
}

window.addEventListener('DOMContentLoaded', errorWrapper.bind(render), false);
