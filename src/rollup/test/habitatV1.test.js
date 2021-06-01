import ethers from 'ethers';

import TransactionBuilder from '@NutBerry/rollup-bricks/src/bricked/lib/TransactionBuilder.js';
import TYPED_DATA from '../habitatV1.js';
import { encodeExternalProposalActions, encodeInternalProposalActions } from './utils.js';
import { getDeployCode } from '../lib/utils.js';

const builder = new TransactionBuilder(TYPED_DATA);

async function createTransaction (primaryType, _message, signer, habitat) {
  const message = {};
  for (const k in _message) {
    let v = _message[k];
    if (typeof v === 'bigint') {
      v = v.toString();
    }
    message[k] = v;
  }

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
    HabitatToken,
    TestERC721,
    ExecutionTest,
    RollupProxy,
    OneThirdParticipationThreshold,
    SevenDayVoting,
    FeatureFarmSignaling,
  } = Artifacts;
  const { rootProvider, alice, bob, charlie } = getDefaultWallets();
  const aliases = {
    [alice.address]: 'alice',
    [bob.address]: 'bob',
    [charlie.address]: 'charlie',
  };
  const balances = {};
  const votes = {};
  const signals = {};
  const delegatedShares = {};
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
  let deployedConditions = {};
  let nftId = 0;
  let leftOverStake = 0n;
  let startEpoch = 0n;
  let endEpoch = 1n;

  afterEach(async() => {
    for (const wallet of [alice, bob]) {
      const tmp = (await habitat.getBalance(erc20.address, wallet.address)).toString();
      assert.equal(balances[wallet.address] || 0n, BigInt(tmp), wallet.address);
    }
  });

  after('cleanup', async () => {
    try {
      await habitatNode.send('debug_kill', []);
    } catch (e) { }
  });

  before('Prepare contracts', async () => {
    erc20 = await deploy(HabitatToken, alice);
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

  function _doRound (abortProposal = false) {
    const depositAmount = 0xffffffn;

    describe('round', async () => {
      async function doDeposit (signer) {
        const user = await signer.getAddress();

        await (await erc20.transfer(user, depositAmount)).wait();
        await (await erc20.connect(signer).approve(bridge.address, depositAmount)).wait();

        const oldBlock = await habitatNode.getBlockNumber();
        const oldBalance = await habitat.getBalance(erc20.address, user);

        const tx = await bridge.connect(signer).deposit(erc20.address, depositAmount, await signer.getAddress());
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());

        const newBalance = await habitat.getBalance(erc20.address, user);
        assert.equal(newBalance.toString(), oldBalance.add(depositAmount).toString(), 'token balance should match');
        cumulativeDeposits += BigInt(depositAmount);
        assert.equal((await habitat.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
        balances[user] = (balances[user] || 0n) + depositAmount;
      }

      async function doNftDeposit (signer) {
        const value = nftId++;
        const user = await signer.getAddress();

        await (await erc721.mint(user, value)).wait();
        await (await erc721.connect(signer).approve(bridge.address, value)).wait();

        const oldBlock = await habitatNode.getBlockNumber();
        const oldBalance = await habitat.getBalance(erc721.address, user);
        const tx = await bridge.connect(signer).deposit(erc721.address, value, user);
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());

        const newOwner = await habitat.getErc721Owner(erc721.address, value);
        assert.equal(newOwner, user, 'nft owner should match');
        const newBalance = await habitat.getBalance(erc721.address, user);
        assert.equal(newBalance.toString(), oldBalance.add(1).toString(), 'token balance should match');
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
        await assert.rejects(createTransaction('TransferToken', args, bob, habitat), /STAKE/);
      });

      it('transfer erc20: alice > bob', async () => {
        const args = {
          token: erc20.address,
          to: bob.address,
          value: 1n,
        };
        const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        assert.equal(receipt.logs.length, 1, 'should emit');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.token, args.token);
        assert.equal(evt.from, alice.address);
        assert.equal(evt.to, args.to);
        assert.equal(evt.value.toString(), BigInt(args.value).toString());
        balances[evt.from] = (balances[evt.from] || 0n) - args.value;
        balances[evt.to] = (balances[evt.to] || 0n) + args.value;
      });

      it('exit erc20: bob', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: 1n,
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
        balances[evt.from] = (balances[evt.from] || 0n) - args.value;
      });

      it('deposit: bob', async () => {
        await doDeposit(bob);
      });

      it('exit erc20: bob', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: BigInt((await habitat.getBalance(erc20.address, bob.address)).toString()),
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
        balances[evt.from] = (balances[evt.from] || 0n) - args.value;
      });

      it('alice: claim user name', async () => {
        const alreadyClaimed = !!names[alice.address];
        const args = {
          shortString: Array.from((new TextEncoder()).encode('alice')),
        };
        const { txHash, receipt } = await createTransaction('ClaimUsername', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'success');
        assert.equal(receipt.logs.length, 1, '# events');

        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        assert.equal(evt.account, alice.address);
        assert.equal(BigInt(evt.shortString), BigInt(ethers.utils.hexlify(args.shortString)));
        names[alice.address] = args.shortString;
      });

      let randomClaimedUsername;
      it('alice: claim random user name', async () => {
        const args = {
          shortString: Array.from(ethers.utils.randomBytes(32)),
        };
        randomClaimedUsername = args.shortString;
        const { txHash, receipt } = await createTransaction('ClaimUsername', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'success');
      });

      it('bob: claiming username from alice should fail', async () => {
        const args = {
          shortString: randomClaimedUsername,
        };
        await assert.rejects(createTransaction('ClaimUsername', args, bob, habitat), /SET/);
      });

      it('alice: free randomn username by choosing another', async () => {
        const args = {
          shortString: Array.from(ethers.utils.randomBytes(32)),
        };
        const { txHash, receipt } = await createTransaction('ClaimUsername', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'success');
      });

      it('bob: claim freed username', async () => {
        const args = {
          shortString: randomClaimedUsername,
        };
        const { receipt } = await createTransaction('ClaimUsername', args, bob, habitat);
        assert.equal(receipt.status, '0x1', 'success');
      });

      function delegate (from, to, amount) {
        it(`${aliases[from.address]}: delegateTo (${aliases[to.address]}, ${amount})`, async () => {
          let expectedError;
          const stake = await habitat.getActiveDelegatedVotingStake(erc20.address, to.address);

          if (from.address === to.address) {
            expectedError = /ODA1/;
          }
          if (amount > balances[from.address]) {
            expectedError = /ODA2/;
          }
          if (amount === 0n && stake.gt(0)) {
            expectedError = /ODA3/;
          }
          const args = {
            delegatee: to.address,
            token: erc20.address,
            value: amount,
          };
          const promise = createTransaction('DelegateAmount', args, from, habitat);
          if (expectedError) {
            await assert.rejects(promise, expectedError);
          } else {
            const { txHash, receipt } = await promise;
            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 1);
            delegatedShares[to.address] = amount;
            delegatedShares[from.address] = amount;
          }
        });
      }

      delegate(alice, alice, 1n);
      delegate(alice, bob, depositAmount);
      delegate(alice, bob, 0n);
      delegate(alice, bob, 1n);
      delegate(alice, bob, depositAmount + 1n);
      delegate(alice, bob, 0xffn);

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
            alice.address.replace('0x', '').padStart(64, '0')
            + args.nonce.replace('0x', '').padStart(64, '0'),
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
        await assert.rejects(createTransaction('CreateVault', args, alice, habitat), /HASH/);
      });

      it('submit voting modules', async () => {
        for (const conditionName in conditions) {
          const condition = conditions[conditionName];
          const expectRevert = !!deployedConditions[condition];
          const args = {
            contractAddress: condition,
            metadata: '{}',
          };

          if (expectRevert) {
            await assert.rejects(createTransaction('SubmitModule', args, alice, habitat), /EXISTS/);
            return;
          }

          const { txHash, receipt } = await createTransaction('SubmitModule', args, alice, habitat);
          assert.equal(receipt.status, '0x1', conditionName);
          assert.equal(receipt.logs.length, 1);
          const evt = habitat.interface.parseLog(receipt.logs[0]).args;
          assert.equal(evt.contractAddress, args.contractAddress);
          deployedConditions[condition] = true;
        }
      });

      let vault;
      it('alice: create a vault', async () => {
        const args = {
          communityId,
          condition: conditions.SevenDayVoting,
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

      async function getPreviousVotingShares (proposalId, account) {
        const filter = habitat.filters.VotedOnProposal(account, proposalId);
        filter.toBlock = 1;
        filter.maxResults = 1;
        const logs = await habitat.provider.send('eth_getLogs', [filter]);
        if (logs.length) {
          const log = habitat.interface.parseLog(logs[0]);
          return log.args.shares;
        }
        return ethers.BigNumber.from(0);
      }

      function vote (wallet, shares, signalStrength = 100) {
        it(`${aliases[wallet.address]}: vote on proposal (shares=${shares}, signalStrength=${signalStrength})`, async () => {
          const args = {
            proposalId,
            signalStrength,
            shares,
            delegatedFor: ethers.constants.AddressZero,
          };
          const previousVote = await getPreviousVotingShares(proposalId, wallet.address);
          const activeVotingStake = BigInt(await habitat.getActiveVotingStake(erc20.address, wallet.address));
          const delegatedAmount = delegatedShares[wallet.address] || 0n;
          const availableBalance = ((balances[wallet.address] || 0n) - (activeVotingStake + delegatedAmount)) + BigInt(previousVote);
          let expectedError;
          if (availableBalance < args.shares) {
            expectedError = /OVOP1/;
          }
          if (args.shares === 0n && args.signalStrength !== 0) {
            expectedError = /SIGNAL/;
          }

          const promise = createTransaction('VoteOnProposal', args, wallet, habitat);
          if (expectedError) {
            await assert.rejects(promise, expectedError);
          } else {
            const { txHash, receipt } = await promise;
            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 1);
            const evt = habitat.interface.parseLog(receipt.logs[0]).args;
            assert.equal(evt.account, alice.address, 'account');
            {
              // check stake
              const stake = await habitat.getActiveVotingStake(erc20.address, evt.account);
              assert.equal(stake.toString(), args.shares.toString(), 'stake');
            }
          }
        });
      }
      vote(alice, 3n);
      vote(alice, depositAmount);
      vote(alice, 0n);
      vote(alice, 9n);
      vote(alice, 0n, 0);
      vote(alice, depositAmount - 10000n);

      function delegatedVote (from, delegatee, shares, signalStrength = 100) {
        const nameFrom = aliases[from.address];
        const nameTo = aliases[delegatee.address];
        it(`${nameFrom}: vote on proposal as delegate ${nameTo} (shares=${shares},signal=${signalStrength})`, async () => {
          const args = {
            proposalId,
            signalStrength,
            shares: shares,
            delegatedFor: delegatee.address,
          };
          const delegatedAmount = delegatedShares[delegatee.address] || 0n;
          let expectedError;
          if (from.address === delegatee.address) {
            if (shares + leftOverStake > delegatedAmount) {
              expectedError = /ODVOP2/;
            }
            if (shares === 0n && signalStrength !== 0) {
              expectedError = /SIGNAL/;
            }
          } else {
            const lastVote = votes[proposalId] || 0n;
            const lastSignal = signals[proposalId] || 0n;

            if (shares >= lastVote) {
              expectedError = /ODVOP3/;
            } else if (shares !== 0n && lastSignal !== signalStrength) {
              expectedError = /ODVOP4/;
            }
          }

          const promise = createTransaction('VoteOnProposal', args, from, habitat);
          if (expectedError) {
            await assert.rejects(promise, expectedError);
          } else {
            const { txHash, receipt } = await promise;
            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 1);
            const evt = habitat.interface.parseLog(receipt.logs[0]);
            assert.equal(evt.args.account, bob.address, 'account');
            votes[proposalId] = shares;
            signals[proposalId] = signalStrength;

            {
              // check stake
              const stake = await habitat.getActiveDelegatedVotingStake(erc20.address, evt.args.account);
              // only replaces the vote with the same amount, should have the same stake
              assert.equal(stake.toString(), (shares + leftOverStake).toString(), 'stake');
            }
          }
        });
      }

      delegatedVote(bob, bob, 22n);
      delegatedVote(bob, bob, 0n);
      delegatedVote(bob, bob, 0xffn);
      delegatedVote(bob, bob, 0xffffn);
      delegatedVote(bob, bob, 0n, 0);
      delegatedVote(bob, bob, 0xffn);
      delegatedVote(alice, bob, 1n, 2);
      delegatedVote(alice, bob, depositAmount * 2n, 0);
      delegatedVote(alice, bob, 1n, 0);
      delegatedVote(alice, bob, 0n, 0);
      delegatedVote(bob, bob, 1n);

      it('keep track of leftover stakes', () => {
        leftOverStake++;
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
        await assert.rejects(createTransaction('ProcessProposal', args, alice, habitat), /STAKE/);
      });

      it('transfer to vault', async () => {
        const args = {
          token: erc20.address,
          to: vault,
          value: 0xffn,
        };
        const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
        assert.equal(receipt.status, '0x1', 'receipt.status');
        // transfer from user to vault
        cumulativeDeposits -= BigInt(args.value);
        balances[alice.address] = (balances[alice.address] || 0n) - args.value;
        balances[vault] = (balances[vault] || 0n) + args.value;
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

        // transfer from vault to user
        cumulativeDeposits += 0xfan;
      });

      vote(alice, 0n, 0);

      describe('staking rewards', () => {
        const operatorAmount = 1234n;
        const divisor = 100n;

        it('set epoch', async () => {
          startEpoch += endEpoch;
          endEpoch += 0xffn;
          const data = '0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14'
            + startEpoch.toString(16).padStart(64, '0');
          const args = {
            data,
          };
          const { receipt } = await createTransaction('ModifyRollupStorage', args, alice, habitat);
          assert.equal(receipt.status, '0x1');

          const newEpoch = BigInt(await habitat.getCurrentEpoch());
          assert.equal(newEpoch, startEpoch);
        });

        it('set staking token - should fail', async () => {
          const data = '0x';
          const args = {
            data,
          };
          await assert.rejects(createTransaction('ModifyRollupStorage', args, bob, habitat), /OMRS1/);
        });

        it('set staking token', async () => {
          const data = '0x777a0813e4fa78b2c1088d37b5a406c9f45908dd6e6e558639a4a33766d33732'
            + erc20.address.replace('0x', '').padStart(64, '0');
          const args = {
            data,
          };
          const { receipt } = await createTransaction('ModifyRollupStorage', args, alice, habitat);
          assert.equal(receipt.status, '0x1');
        });

        it('TributeForOperator', async () => {
          const expectedFee = operatorAmount / divisor;
          const args = {
            operator: charlie.address,
            amount: operatorAmount,
            token: erc20.address,
          };

          const { receipt } = await createTransaction('TributeForOperator', args, alice, habitat);
          assert.equal(receipt.status, '0x1');

          {
            // fee transfer
            const log = habitat.interface.parseLog(receipt.logs[0]);
            assert.equal(BigInt(log.args.value), expectedFee, 'fee');
            assert.equal(log.args.from, alice.address, 'from');
            assert.equal(log.args.to, '0x' + startEpoch.toString(16).padStart(40, '0'), 'to');
          }
          {
            const log = habitat.interface.parseLog(receipt.logs[1]);
            assert.equal(BigInt(log.args.value), operatorAmount - expectedFee, 'fee');
            assert.equal(log.args.from, alice.address, 'from');
            assert.equal(log.args.to, args.operator, 'to');
          }

          balances[alice.address] -= args.amount;
          balances[args.operator] = (balances[args.operator] || 0n) + expectedFee;
        });

        it('claim reward - fail, epoch not closed yet', async () => {
          const args = {
            token: erc20.address,
          };
          await assert.rejects(createTransaction('ClaimStakingReward', args, alice, habitat), /OCSR1/);
        });

        it('set epoch', async () => {
          const data = '0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14'
            + (startEpoch + 4n).toString(16).padStart(64, '0');
          const args = {
            data,
          };
          const { receipt } = await createTransaction('ModifyRollupStorage', args, alice, habitat);
          assert.equal(receipt.status, '0x1');
        });

        it('TributeForOperator', async () => {
          const expectedFee = operatorAmount / divisor;
          const args = {
            operator: charlie.address,
            amount: operatorAmount,
            token: erc20.address,
          };

          const { receipt } = await createTransaction('TributeForOperator', args, alice, habitat);
          assert.equal(receipt.status, '0x1');

          {
            // fee transfer
            const log = habitat.interface.parseLog(receipt.logs[0]);
            assert.equal(BigInt(log.args.value), expectedFee, 'fee');
            assert.equal(log.args.from, alice.address, 'from');
            assert.equal(log.args.to, '0x' + (startEpoch + 4n).toString(16).padStart(40, '0'), 'to');
          }
          {
            const log = habitat.interface.parseLog(receipt.logs[1]);
            assert.equal(BigInt(log.args.value), operatorAmount - expectedFee, 'fee');
            assert.equal(log.args.from, alice.address, 'from');
            assert.equal(log.args.to, args.operator, 'to');
          }

          balances[alice.address] -= args.amount;
          balances[args.operator] = (balances[args.operator] || 0n) + expectedFee;
        });

        it('set epoch', async () => {
          const data = '0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14'
            + endEpoch.toString(16).padStart(64, '0');
          const args = {
            data,
          };
          const { receipt } = await createTransaction('ModifyRollupStorage', args, alice, habitat);
          assert.equal(receipt.status, '0x1');
        });

        it('claim reward', async () => {
          const args = {
            token: erc20.address,
          };
          const { receipt } = await createTransaction('ClaimStakingReward', args, alice, habitat);
          assert.equal(receipt.logs.length, Number(endEpoch - startEpoch) + 2);

          const expectedReward = 12n;
          {
            // first reward
            const log = habitat.interface.parseLog(receipt.logs[0]);
            assert.equal(BigInt(log.args.value), expectedReward, 'fee');
            assert.equal(log.args.to, alice.address, 'to');
            assert.equal(log.args.from, '0x' + startEpoch.toString(16).padStart(40, '0'), 'from');
            {
              const log = habitat.interface.parseLog(receipt.logs[1]);
              assert.equal(BigInt(log.args.amount), expectedReward, 'reward');
              assert.equal(log.args.account, alice.address, 'account');
            }
          }
          {
            // second reward
            const log = habitat.interface.parseLog(receipt.logs[5]);
            assert.equal(BigInt(log.args.value), expectedReward, 'fee2');
            assert.equal(log.args.to, alice.address, 'to');
            assert.equal(log.args.from, '0x' + (startEpoch + 4n).toString(16).padStart(40, '0'), 'from');
            {
              const log = habitat.interface.parseLog(receipt.logs[6]);
              assert.equal(BigInt(log.args.amount), expectedReward, 'reward2');
              assert.equal(log.args.account, alice.address, 'account');
            }
          }

          // balance of alice should increase by reward
          balances[alice.address] += expectedReward * 2n;

          // claiming again should fail
          await assert.rejects(createTransaction('ClaimStakingReward', args, alice, habitat), /OCSR1/);
        });
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
});
