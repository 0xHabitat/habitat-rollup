import ethers from 'ethers';

import TransactionBuilder from '@NutBerry/rollup-bricks/src/bricked/lib/TransactionBuilder.js';
import TYPED_DATA from '../habitatV1.js';
import { encodeExternalProposalActions, encodeInternalProposalActions } from './utils.js';
import { getDeployCode } from '../lib/utils.js';

const builder = new TransactionBuilder(TYPED_DATA);

async function createTransaction (primaryType, message, signer, habitat) {
  if (message.nonce === undefined && builder.fieldNames[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.txNonces(signer.address)).toHexString();
  }

  const tx = {
    primaryType,
    message,
  };
  const hash = builder.sigHash(tx);
  const { r, s, v } = signer._signingKey().signDigest(hash);

  Object.assign(tx, { r, s, v });

  const txHash = await habitat.provider.send('eth_sendRawTransaction', [tx]);
  const receipt = await habitat.provider.send('eth_getTransactionReceipt', [txHash]);

  return { txHash, receipt };
}

describe('HabitatV1', async function () {
  const {
    HabitatV1Mock,
    ExecutionProxy,
    TestERC20,
    TestERC721,
    ExecutionTest,
    RollupProxy,
    OneThirdParticipationThreshold,
    SevenDayVoting,
    FeatureFarmSignaling,
  } = Artifacts;
  const { rootProvider, alice, bob, charlie } = getDefaultWallets();
  let bridge;
  let rollupProxy;
  let rollupImplementation;
  let habitat;
  let habitatNode;
  let executionProxy;
  let erc20;
  let erc721;
  let cumulativeDeposits = BigInt(0);
  let cumulativeNft = BigInt(0);
  let proposalIndex;
  let executionTestContract;

  let names = {};
  let round = 0;
  let proposals = [];
  let invalidAction;
  let validAction;
  let conditions = {};
  let nftId = 0;

  before('Prepare contracts', async () => {
    erc20 = await deploy(TestERC20, alice);
    erc721 = await deploy(TestERC721, alice, 'NFT', 'NFT');

    rollupImplementation = await deploy(HabitatV1Mock, alice);
    rollupProxy = await deploy(RollupProxy, alice, rollupImplementation.address);
    bridge = new ethers.Contract(rollupProxy.address, HabitatV1Mock.abi, alice);

    habitatNode = await startNode('../../bricked/lib/index.js', 9999, 0, bridge.address, TYPED_DATA);
    habitat = bridge.connect(habitatNode);

    executionProxy = await deploy(ExecutionProxy, alice, bridge.address);
    executionTestContract = await deploy(ExecutionTest, alice, executionProxy.address);

    for (const condition of [OneThirdParticipationThreshold, SevenDayVoting, FeatureFarmSignaling]) {
      const bytecode = getDeployCode(condition.deployedBytecode);
      conditions[condition.contractName] = (await deploy({ bytecode, abi: [] }, alice)).address;
    }

    invalidAction = encodeExternalProposalActions(
      [
        executionTestContract.address,
        '0xbadc0ffe',
      ]
    );
    validAction = encodeExternalProposalActions(
      [
        executionTestContract.address,
        executionTestContract.interface.encodeFunctionData('changeSomething', ['0xbadbeef']),
      ]
    );
  });

  let vaultCondition;
  function _doRound (abortProposal = false) {
    const depositAmount = '0xffffffff';

    describe('round', async () => {
      async function doDeposit (signer) {
        const user = await signer.getAddress();

        await (await erc20.transfer(user, depositAmount)).wait();
        await (await erc20.connect(signer).approve(bridge.address, depositAmount)).wait();

        const oldBlock = await habitatNode.getBlockNumber();
        const oldBalance = await habitat.getErc20Balance(erc20.address, user);

        const tx = await bridge.connect(signer).deposit(erc20.address, depositAmount, await signer.getAddress());
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());

        const newBalance = await habitat.getErc20Balance(erc20.address, user);
        assert.equal(newBalance.toString(), oldBalance.add(depositAmount).toString(), 'token balance should match');
        cumulativeDeposits += BigInt(depositAmount);
        assert.equal((await habitat.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
      }

      async function doNftDeposit (signer) {
        const value = nftId++;
        const user = await signer.getAddress();

        await (await erc721.mint(user, value)).wait();
        await (await erc721.connect(signer).approve(bridge.address, value)).wait();

        const oldBlock = await habitatNode.getBlockNumber();
        const tx = await bridge.connect(signer).deposit(erc721.address, value, user);
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());

        const newOwner = await habitat.getErc721Owner(erc721.address, value);
        assert.equal(newOwner, user, 'nft owner should match');
        cumulativeNft++;
        assert.equal((await habitat.getTotalValueLocked(erc721.address)).toString(), cumulativeNft.toString(), 'tvl');
      }

      it('init', async () => {
        round++;
      });

      it('deposit: alice', async () => {
        await doDeposit(alice);
      });

      it('deposit nft: alice ', async () => {
        await doNftDeposit(alice);
      });

      it('exit nft: bob - should fail', async () => {
        const args = {
          token: erc721.address,
          to: ethers.constants.AddressZero,
          value: nftId - 1,
        };
        await assert.rejects(createTransaction('TransferToken', args, bob, habitat), /OWNER/);
      });

      it('transfer erc721: alice > bob', async () => {
        const args = {
          token: erc721.address,
          to: bob.address,
          value: nftId - 1,
        };

        const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.logs.length, 1, 'should emit');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.token, args.token);
        assert.equal(evt.from, alice.address);
        assert.equal(evt.to, args.to);
        assert.equal(evt.value.toString(), BigInt(args.value).toString());
      });

      it('exit nft: bob', async () => {
        const args = {
          token: erc721.address,
          to: ethers.constants.AddressZero,
          value: nftId - 1,
        };

        const { txHash, receipt } = await createTransaction('TransferToken', args, bob, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.logs.length, 1, 'should emit');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.token, args.token);
        assert.equal(evt.from, bob.address);
        assert.equal(evt.to, args.to);
        assert.equal(evt.value.toString(), BigInt(args.value).toString());
        cumulativeNft--;
        assert.equal((await habitat.getTotalValueLocked(erc721.address)).toString(), cumulativeNft.toString(), 'tvl');
      });

      it('exit erc20: bob - should fail', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: '0x1',
        };
        await assert.rejects(createTransaction('TransferToken', args, bob, habitat), /BALANCE/);
      });

      it('transfer erc20: alice > bob', async () => {
        const args = {
          token: erc20.address,
          to: bob.address,
          value: '0x1',
        };

        const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.logs.length, 1, 'should emit');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.token, args.token);
        assert.equal(evt.from, alice.address);
        assert.equal(evt.to, args.to);
        assert.equal(evt.value.toString(), BigInt(args.value).toString());
      });

      it('exit erc20: bob', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: '0x1',
        };

        const { txHash, receipt } = await createTransaction('TransferToken', args, bob, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.logs.length, 1, 'should emit');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.token, args.token);
        assert.equal(evt.from, bob.address);
        assert.equal(evt.to, args.to);
        assert.equal(evt.value.toString(), BigInt(args.value).toString());
        cumulativeDeposits -= BigInt(args.value);
        assert.equal((await habitat.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
      });

      it('deposit: bob', async () => {
        await doDeposit(bob);
      });

      it('exit erc20: bob', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: (await habitat.getErc20Balance(erc20.address, bob.address)).toHexString(),
        };

        const { txHash, receipt } = await createTransaction('TransferToken', args, bob, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.logs.length, 1, 'should emit');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.token, args.token);
        assert.equal(evt.from, bob.address);
        assert.equal(evt.to, args.to);
        assert.equal(evt.value.toString(), BigInt(args.value).toString());
        cumulativeDeposits -= BigInt(args.value);
        assert.equal((await habitat.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
      });

      it('alice: claim user name', async () => {
        const alreadyClaimed = !!names[alice.address];
        const args = {
          shortString: Array.from((new TextEncoder()).encode('alice')),
        };
        if (alreadyClaimed) {
          await assert.rejects(createTransaction('ClaimUsername', args, alice, habitat), /SET/);
        } else {
          const { txHash, receipt } = await createTransaction('ClaimUsername', args, alice, habitat);
          assert.equal(receipt.status, '0x1', 'success');
          assert.equal(receipt.logs.length, 1, '# events');

          const evt = habitat.interface.parseLog(receipt.logs[0]).args;
          assert.equal(evt.account, alice.address);
          assert.equal(BigInt(evt.shortString), BigInt(ethers.utils.hexlify(args.shortString)));
          assert.equal(await habitat.nameToAddress(evt.shortString), alice.address);
          names[alice.address] = args.shortString;
        }
      });

      it('alice: claim random user name', async () => {
        const args = {
          shortString: Array.from(ethers.utils.randomBytes(32)),
        };
        const { txHash, receipt } = await createTransaction('ClaimUsername', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'success');
      });

      it('alice: setDelegate', async () => {
        const args = {
          to: bob.address,
        };
        const { txHash, receipt } = await createTransaction('SetDelegate', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
      });

      let communityId;
      it('alice: create a new community', async () => {
        const metadata = '{}';
        const args = {
          nonce: (await habitat.txNonces(alice.address)).toHexString(),
          governanceToken: erc20.address,
          metadata,
        };
        const { txHash, receipt } = await createTransaction('CreateCommunity', args, alice, habitat);

        assert.equal(receipt.logs.length, 1, '#events');
        assert.equal(receipt.status, '0x1', 'status');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.governanceToken, args.governanceToken, 'governanceToken');
        assert.equal(evt.metadata, args.metadata, 'metadata');
        communityId = ethers.utils.keccak256(
          Buffer.from(
            alice.address.replace('0x', '').padStart(64, '0') +
            args.nonce.replace('0x', '').padStart(64, '0') +
            args.governanceToken.replace('0x', '').padStart(64, '0'),
            'hex'
          )
        );
        assert.equal(evt.communityId, communityId, 'communityId');
      });

      it('alice: create a vault - should fail', async () => {
        const vaultCondition = ethers.constants.AddressZero;
        const args = {
          communityId,
          condition: vaultCondition,
          metadata: '{}',
        };
        await assert.rejects(createTransaction('CreateVault', args, alice, habitat), 'ACTIVE');
      });

      it('activate condition should fail - not submitted yet', async () => {
        const vaultCondition = ethers.constants.AddressZero;
        const args = {
          communityId,
          condition: vaultCondition,
        };
        await assert.rejects(createTransaction('ActivateModule', args, alice, habitat), /HASH/);
      });

      it('submit SevenDayVoting module', async () => {
        const expectRevert = !!vaultCondition;

        vaultCondition = conditions.SevenDayVoting;
        const args = {
          contractAddress: vaultCondition,
          metadata: '{}',
        };

        if (expectRevert) {
          await assert.rejects(createTransaction('SubmitModule', args, alice, habitat), /EXISTS/);
          return;
        }

        const { txHash, receipt } = await createTransaction('SubmitModule', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.contractAddress, args.contractAddress);
      });

      it('activate SevenDayVoting', async () => {
        const args = {
          communityId,
          condition: vaultCondition,
        };
        const { txHash, receipt } = await createTransaction('ActivateModule', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.communityId, args.communityId);
        assert.equal(evt.condition, args.condition);
      });

      let vault;
      it('alice: create a vault', async () => {
        const args = {
          communityId,
          condition: vaultCondition,
          metadata: '{}',
        };
        const { txHash, receipt } = await createTransaction('CreateVault', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.communityId, args.communityId);
        assert.equal(evt.condition, args.condition);
        vault = evt.vaultAddress;
      });

      let proposalId;
      let internalActions;
      let externalActions = encodeExternalProposalActions([charlie.address, '0x']);
      it('create proposal for first vault', async () => {
        // token transfer
        internalActions = encodeInternalProposalActions(['0x01', erc20.address, charlie.address, '0xfa']);
        const args = {
          // almost seven days
          startDate: ~~(Date.now() / 1000) - ((3600*24*7) - 3),
          vault,
          internalActions,
          externalActions,
          metadata: JSON.stringify({ title: 'hello world' }),
        };
        const { txHash, receipt } = await createTransaction('CreateProposal', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        proposalId = evt.proposalId;

        proposals.push({ vault, proposalId, internalActions, externalActions, valid: true });
      });

      it('process proposal - should remain open', async () => {
        const args = {
          proposalId,
          internalActions,
          externalActions,
        };
        const { txHash, receipt } = await createTransaction('ProcessProposal', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(Number(evt.votingStatus), 1);
      });

      it('alice: vote on proposal', async () => {
        const args = {
          proposalId,
          signalStrength: 100,
          shares: 0xffffff00,
          timestamp: ~~(Date.now() / 1000),
          delegatedFor: ethers.constants.AddressZero,
        };
        const { txHash, receipt } = await createTransaction('VoteOnProposal', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.account, alice.address);
      });

      it('bob: vote on proposal as a delegate for alice', async () => {
        const args = {
          proposalId,
          signalStrength: 100,
          shares: 0xffffff00,
          timestamp: ~~(Date.now() / 1000),
          delegatedFor: alice.address,
        };
        const { txHash, receipt } = await createTransaction('VoteOnProposal', args, bob, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.account, alice.address);
      });

      it('process proposal - should still be open', async () => {
        const args = {
          proposalId,
          internalActions,
          externalActions,
        };
        const { txHash, receipt } = await createTransaction('ProcessProposal', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 1);
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(Number(evt.votingStatus), 1);
      });

      // we are submitting this block to avoid time-based errors later in the timestamp checks
      it('submitBlock', () => submitBlock(bridge, rootProvider, habitatNode));

      it('sleep', async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      });

      it('process proposal - should revert, vault has no balance', async () => {
        const args = {
          proposalId,
          internalActions,
          externalActions,
        };
        await assert.rejects(createTransaction('ProcessProposal', args, alice, habitat), /BALANCE/);
      });

      it('transfer to vault', async () => {
        const args = {
          token: erc20.address,
          to: vault,
          value: '0xff',
        };
        const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
      });

      it('process proposal - should revert, invalid internalActons', async () => {
        const args = {
          proposalId,
          internalActions: '0xfafa',
          externalActions,
        };
        await assert.rejects(createTransaction('ProcessProposal', args, alice, habitat), /IHASH/);
      });

      it('process proposal - should revert, invalid externalActions', async () => {
        const args = {
          proposalId,
          internalActions,
          externalActions: '0xfafa',
        };
        await assert.rejects(createTransaction('ProcessProposal', args, alice, habitat), /EHASH/);
      });

      it('process proposal - should pass', async () => {
        const args = {
          proposalId,
          internalActions,
          externalActions,
        };
        const { txHash, receipt } = await createTransaction('ProcessProposal', args, alice, habitat);
        assert.equal(receipt.status, '0x1');
        assert.equal(receipt.logs.length, 2);
        {
          // should be a transfer
          const evt = habitat.interface.parseLog(receipt.logs[0]).args;
          assert.equal(evt.token, erc20.address);
          assert.equal(evt.to, charlie.address);
          assert.equal(evt.value.toHexString(), '0xfa');
        }
        {
          const evt = habitat.interface.parseLog(receipt.logs[1]).args;
          assert.equal(Number(evt.votingStatus), 3);
        }
      });
    });
  }

  function doRound () {
    it('reset proposal array', async () => {
      proposals = [];
    });

    _doRound();
  }

  function doExecutionTest () {
    const GAS_LIMIT = 10_000_000;

    describe('on-chain execution tests', () => {
      it('check execution permit and execute', async () => {
        for (const { vault, proposalId, externalActions, valid } of proposals) {
          const ok = await bridge.executionPermit(vault, proposalId);

          assert.equal(!!Number(ok), valid, 'execution permit only for valid proposals');

          let expected = valid; //args.actions === validAction;
          // try to execute
          let result;
          if (expected) {
            const tx = await executionProxy.execute(vault, proposalId, externalActions);
            const receipt = await tx.wait();
            result = !!receipt.status;
          } else {
            await assertRevert(executionProxy.execute(vault, proposalId, externalActions, { gasLimit: GAS_LIMIT }));
            result = false;
          }

          assert.equal(result, expected, 'expected execution result via proxy');
          console.log({ proposalId, expected });

          if (expected) {
            // a second time should fail
            await assertRevert(executionProxy.execute(vault, proposalId, externalActions, { gasLimit: GAS_LIMIT }));
          }
        }
      });

      it('non existent permits', async () => {
        await assertRevert(executionProxy.execute(charlie.address, ethers.utils.keccak256('0xff'), '0x', { gasLimit: GAS_LIMIT }));
      });
    });
  }

  describe('chain - forward', function () {
    doRound();
    describe('finalize', function () {
      it('submitBlock', () => submitBlock(bridge, rootProvider, habitatNode));
      it('doForward', () => doForward(bridge, rootProvider, habitatNode));
      it('debugStorage', () => debugStorage(bridge, rootProvider, habitatNode));
    });
    doExecutionTest();
  });

  describe('chain - challenge', function () {
    doRound();
    describe('finalize', function () {
      it('submitBlock', () => submitBlock(bridge, rootProvider, habitatNode));
      it('doChallenge', () => doChallenge(bridge, rootProvider, habitatNode));
      it('debugStorage', () => debugStorage(bridge, rootProvider, habitatNode));
    });
    doExecutionTest();
  });

  describe('kill node', () => {
    it('debug_kill', async () => {
      try {
        await habitatNode.send('debug_kill', []);
      } catch (e) {
      }
    });
  });
});
