import ethers from 'ethers';

import TransactionBuilder from '@NutBerry/rollup-bricks/src/bricked/lib/TransactionBuilder.js';
import TYPED_DATA from '../typedData.js';

const { GovBrick, TestERC20 } = Artifacts;

const builder = new TransactionBuilder(TYPED_DATA);

async function createTransaction (primaryType, message, signer) {
  if (message.nonce === undefined) {
    message.nonce = await signer.getTransactionCount('pending');
  }

  const tx = {
    primaryType,
    message,
  };
  const hash = builder.sigHash(tx);
  const { r, s, v } = signer._signingKey().signDigest(hash);

  Object.assign(tx, { r, s, v });

  const encoded = builder.encode(tx);
  const decoded = builder.decode(encoded);

  assert.equal(decoded.from, signer.address.toLowerCase());

  let str = '';
  for (const v of encoded) {
    str += v.toString(16).padStart(2, '0');
  }

  return str;
}

describe('GovBrick', async function () {
  const { alice, bob, charlie } = getDefaultWallets();
  const rootRpcUrl = `http://localhost:${process.env.RPC_PORT}`;
  const rootProvider = new ethers.providers.JsonRpcProvider(rootRpcUrl);
  let bridge;
  let govBrick;
  let myNode;
  let erc20;
  let cumulativeDeposits = BigInt(0);
  let proposalIndex;

  before('Prepare contracts', async () => {
    erc20 = await deploy(TestERC20, alice);
    govBrick = await deploy(GovBrick, alice);
    myNode = await startNode('../../bricked/lib/index.js', 9999, 0, govBrick.address, TYPED_DATA);
    bridge = govBrick.connect(myNode);
  });

  let alreadyInitialized = false;
  let round = 0;
  let subShares = 0;

  function _doRound (abortProposal = false) {
    const depositAmount = '0xffffffff';

    describe('Moloch round', async () => {
      async function doDeposit (signer) {
        const user = await signer.getAddress();

        await (await erc20.transfer(user, depositAmount)).wait();
        await (await erc20.connect(signer).approve(govBrick.address, depositAmount)).wait();

        const oldBlock = await myNode.getBlockNumber();
        //const oldBalance = await bridge.balances(erc20.address, user);

        const tx = await govBrick.connect(signer).deposit(erc20.address, depositAmount);
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => myNode.getBlockNumber());

        //const newBalance = await bridge.balances(erc20.address, user);
        //assert.equal(newBalance.toString(), oldBalance.add(depositAmount).toString(), 'token balance should match');
        cumulativeDeposits += BigInt(depositAmount);
      }

      it('InitMoloch: alice', async () => {
        round++;

        const args = {
          summoner: await alice.getAddress(),
          approvedToken: erc20.address,
          periodDuration: 1,
          votingPeriod: 10,
          gracePeriod: 1,
          abortWindow: 1,
          proposalDeposit: 0,
          dilutionBound: 1,
          processingReward: 0,
        };

        const rawTx = '0x' + await createTransaction('InitMoloch', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, alreadyInitialized ? '0x0' : '0x1', 'receipt.status');
        alreadyInitialized = true;

        if (round === 1) {
          // submit the block after first init
          await submitBlock(govBrick, rootProvider, myNode);
        }
      });

      it('allowance', async () => {
        const tx = await erc20.approve(govBrick.address, depositAmount);
        const receipt = await tx.wait();
      });

      it('deposit: alice', async () => {
        await doDeposit(alice);
      });

      it('submitProposal: alice', async () => {
        const args = {
          applicant: await alice.getAddress(),
          tokenTribute: 0,
          sharesRequested: 0,
          details: 'Hello World',
        };

        const rawTx = '0x' + await createTransaction('SubmitProposal', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');

        proposalIndex = bridge.interface.parseLog(receipt.logs[0]).args.proposalIndex;
      });

      it('deposit: bob', async () => {
        await doDeposit(bob);
      });

      it('check member.shares', async () => {
        const mAlice = await bridge.members(await alice.getAddress());
        const mBob = await bridge.members(await bob.getAddress());

        assert.equal(mAlice.shares.toString(), ((depositAmount * round) - subShares).toString());
        assert.equal(mBob.shares.toString(), ((depositAmount * round)).toString());
      });

      it('submitVote: alice', async () => {
        const args = {
          proposalIndex,
          uintVote: 1,
        };

        const rawTx = '0x' + await createTransaction('SubmitVote', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      it('submitVote: bob', async () => {
        const args = {
          proposalIndex,
          uintVote: 2,
        };
        subShares++;

        const rawTx = '0x' + await createTransaction('SubmitVote', args, bob);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      if (abortProposal) {
        it('Abort: alice', async () => {
          const args = {
            proposalIndex,
          };

          const rawTx = '0x' + await createTransaction('Abort', args, alice);
          const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
          const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

          assert.equal(receipt.status, '0x1', 'receipt.status');
        });
      }

      it('ProcessProposal: alice', async () => {
        const args = {
          proposalIndex,
        };

        const rawTx = '0x' + await createTransaction('ProcessProposal', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      it('UpdateDelegateKey: alice to charlie', async () => {
        const args = {
          newDelegateKey: await charlie.getAddress(),
        };

        const rawTx = '0x' + await createTransaction('UpdateDelegateKey', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      it('Ragequit: alice', async () => {
        const args = {
          sharesToBurn: 1,
        };
        const rawTx = '0x' + await createTransaction('Ragequit', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      it('submitProposal: charlie', async () => {
        const args = {
          applicant: await charlie.getAddress(),
          tokenTribute: 0,
          sharesRequested: 0,
          details: 'Hello World',
        };

        const rawTx = '0x' + await createTransaction('SubmitProposal', args, charlie);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');

        proposalIndex = bridge.interface.parseLog(receipt.logs[0]).args.proposalIndex;
      });

      it('ProcessProposal: charlie', async () => {
        const args = {
          proposalIndex,
        };

        const rawTx = '0x' + await createTransaction('ProcessProposal', args, charlie);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      it('UpdateDelegateKey: restore alice', async () => {
        const args = {
          newDelegateKey: await alice.getAddress(),
        };

        const rawTx = '0x' + await createTransaction('UpdateDelegateKey', args, alice);
        const txHash = await myNode.send('eth_sendRawTransaction', [rawTx]);
        const receipt = await myNode.send('eth_getTransactionReceipt', [txHash]);

        assert.equal(receipt.status, '0x1', 'receipt.status');
      });
    });
  }

  function doRound () {
    _doRound(false);
    _doRound(true);
  }

  describe('chain - forward', function () {
    doRound();
    describe('finalize', function () {
      it('submitBlock', () => submitBlock(govBrick, rootProvider, myNode));
      it('doForward', () => doForward(govBrick, rootProvider, myNode));
      it('debugStorage', () => debugStorage(govBrick, rootProvider, myNode));
    });
  });

  describe('chain - challenge', function () {
    doRound();
    describe('finalize', function () {
      it('submitBlock', () => submitBlock(govBrick, rootProvider, myNode));
      it('doChallenge', () => doChallenge(govBrick, rootProvider, myNode));
      it('debugStorage', () => debugStorage(govBrick, rootProvider, myNode));
      it('sleep', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });
      //it('debugStorage', () => debugStorage(govBrick, rootProvider, myNode));
    });
  });

  describe('kill node', () => {
    it('debug_kill', async () => {
      try {
        await myNode.send('debug_kill', []);
      } catch (e) {
      }
    });
  });
});
