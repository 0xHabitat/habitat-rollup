import ethers from 'ethers';

import TYPED_DATA from '../habitatV1.js';
import {
  encodeExternalProposalActions,
  encodeInternalProposalActions,
  createTransaction,
} from './utils.js';

describe('HabitatV1', async function () {
  const {
    HabitatV1Mock,
    ExecutionProxy,
    HabitatToken,
    ERC721,
    ExecutionTest,
    RollupProxy,
    OneThirdParticipationThreshold,
    SevenDayVoting,
    FeatureFarmSignaling,
  } = Artifacts;
  const { rootProvider, alice, bob, charlie, eva } = getDefaultWallets();
  const aliases = {
    [alice.address]: 'alice',
    [bob.address]: 'bob',
    [charlie.address]: 'charlie',
    [eva.address]: 'eva',
  };
  const balances = {
    [alice.address]: 0n,
    [bob.address]: 0n,
    [charlie.address]: 0n,
    [eva.address]: 0n,
  };
  const votes = {};
  const signals = {};
  const delegatedShares = {};
  const executionProxyForVault = {};
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
  let startEpoch = 0;
  let endEpoch = 1;
  let vaults = [];

  afterEach(async() => {
    for (const wallet of [alice, bob, charlie]) {
      const balance = BigInt(await habitat.callStatic.getBalance(erc20.address, wallet.address));
      assert.equal(balances[wallet.address] || 0n, balance, wallet.address);

      const totalAllowance = BigInt(await habitat.callStatic.getTotalDelegatedAmount(wallet.address, erc20.address));
      assert.ok(totalAllowance <= balance, 'total delegated');

      const free = BigInt(await habitat.callStatic.getUnlockedBalance(erc20.address, wallet.address));
      const votingStake = BigInt(await habitat.callStatic.getActiveVotingStake(erc20.address, wallet.address));
      assert.equal(free, balance - totalAllowance - votingStake, 'free');
    }

    let tvl = 0n;
    for (const key in balances) {
      if (vaults.indexOf(key) === -1) {
        tvl += balances[key];
      }
    }

    assert.equal((await habitat.callStatic.getTotalValueLocked(erc20.address)).toString(), tvl.toString(), 'tvl');
  });

  after('cleanup', async () => {
    try {
      await habitatNode.send('debug_kill', []);
    } catch (e) { }
  });

  before('Prepare contracts', async () => {
    erc20 = await deploy(HabitatToken, alice);
    erc721 = await deploy(ERC721, alice, 'NFT', 'NFT');

    rollupImplementation = await deploy(HabitatV1Mock, alice);
    rollupProxy = await deploy(RollupProxy, alice, rollupImplementation.address);
    bridge = new ethers.Contract(rollupProxy.address, HabitatV1Mock.abi, alice);

    habitatNode = await startNode('../../v1/lib/index.js', 9999, 0, bridge.address, TYPED_DATA);
    habitat = bridge.connect(habitatNode);

    executionProxy = await deploy(ExecutionProxy, alice);
    executionTestContract = await deploy(ExecutionTest, alice, executionProxy.address);

    for (const condition of [OneThirdParticipationThreshold, SevenDayVoting, FeatureFarmSignaling]) {
      conditions[condition.contractName] = (await deploy(condition, alice)).address;
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
      async function setTime (timestamp) {
        const args = {
          data: '0xb332e0078e64900acaff304c1adfa23f92f90f1431e5da2d32fc43b8780f91c9'
          + timestamp.toString(16).padStart(64, '0'),
        };
        await createTransaction('ModifyRollupStorage', args, alice, habitat);
      }

      async function doDeposit (signer, vault) {
        const user = await signer.getAddress();
        const receiver = vault || user;

        await (await erc20.transfer(user, depositAmount)).wait();
        await (await erc20.connect(signer).approve(bridge.address, depositAmount)).wait();

        const oldBlock = await habitatNode.getBlockNumber();
        const oldBalance = await habitat.callStatic.getBalance(erc20.address, receiver);

        const tx = await bridge.connect(signer).deposit(erc20.address, depositAmount, receiver);
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());

        const newBalance = await habitat.callStatic.getBalance(erc20.address, receiver);
        assert.equal(newBalance.toString(), oldBalance.add(depositAmount).toString(), 'token balance should match');

        if (!vault) {
          cumulativeDeposits += BigInt(depositAmount);
        }
        assert.equal((await habitat.callStatic.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
        balances[receiver] = (balances[receiver] || 0n) + depositAmount;
      }

      async function doNftDeposit (signer) {
        const value = nftId++;
        const user = await signer.getAddress();

        await (await erc721.mint(user, value)).wait();
        await (await erc721.connect(signer).approve(bridge.address, value)).wait();

        const oldBlock = await habitatNode.getBlockNumber();
        const oldBalance = await habitat.callStatic.getBalance(erc721.address, user);
        const tx = await bridge.connect(signer).deposit(erc721.address, value, user);
        const receipt = await tx.wait();

        await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());

        const newOwner = await habitat.callStatic.getErc721Owner(erc721.address, value);
        assert.equal(newOwner, user, 'nft owner should match');
        const newBalance = await habitat.callStatic.getBalance(erc721.address, user);
        assert.equal(newBalance.toString(), oldBalance.add(1).toString(), 'token balance should match');
        cumulativeNft++;
        assert.equal((await habitat.callStatic.getTotalValueLocked(erc721.address)).toString(), cumulativeNft.toString(), 'tvl');
      }

      it('init', async () => {
        round++;
      });

      it('rollup update', async () => {
        const tx = await bridge.connect(alice).upgradeRollup(rollupImplementation.address);
        const receipt = await tx.wait();
        assert.equal(receipt.logs.length, 1);
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
        assert.equal((await habitat.callStatic.getTotalValueLocked(erc721.address)).toString(), cumulativeNft.toString(), 'tvl');
      });

      it('exit erc20: bob - should fail', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: balances[bob.address] + 1n,
        };
        await assert.rejects(createTransaction('TransferToken', args, bob, habitat), /LOCK/);
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
        assert.equal((await habitat.callStatic.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
        balances[evt.from] = (balances[evt.from] || 0n) - args.value;
      });

      it('deposit: bob', async () => {
        await doDeposit(bob);
      });

      it('exit erc20: bob', async () => {
        const args = {
          token: erc20.address,
          to: ethers.constants.AddressZero,
          value: BigInt((await habitat.callStatic.getBalance(erc20.address, bob.address)).toString()),
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
        assert.equal((await habitat.callStatic.getTotalValueLocked(erc20.address)).toString(), cumulativeDeposits.toString(), 'tvl');
        balances[evt.from] = (balances[evt.from] || 0n) - args.value;
      });

      it('alice: claim user name', async () => {
        const alreadyClaimed = !!names[alice.address];
        const args = {
          shortString: ethers.utils.formatBytes32String('alice'),
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
          shortString: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
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
          shortString: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
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

      it('alice: create a new community with token = 0; should fail', async () => {
        const args = {
          governanceToken: ethers.constants.AddressZero,
          metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({}))),
        };
        await assert.rejects(createTransaction('CreateCommunity', args, alice, habitat), /OCC1/);
      });

      let communityId;
      it('alice: create a new community', async () => {
        const args = {
          nonce: (await habitat.callStatic.txNonces(alice.address)).toHexString(),
          governanceToken: erc20.address,
          metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({}))),
        };
        const { txHash, receipt } = await createTransaction('CreateCommunity', args, alice, habitat);

        assert.equal(receipt.logs.length, 2, '#events');
        assert.equal(receipt.status, '0x1', 'status');
        const evt = habitat.interface.parseLog(receipt.logs[0]).args;
        const metaEvent = habitat.interface.parseLog(receipt.logs[1]).args;
        assert.equal(evt.governanceToken, args.governanceToken, 'governanceToken');
        assert.equal(metaEvent.metadata, args.metadata, 'metadata');
        communityId = ethers.utils.keccak256(
          Buffer.from(
            alice.address.replace('0x', '').padStart(64, '0')
            + args.nonce.replace('0x', '').padStart(64, '0'),
            'hex'
          )
        );
        assert.equal(evt.communityId, communityId, 'communityId');
        assert.equal(metaEvent.topic.toHexString(), communityId, 'metadata topic');
      });

      it('alice: create a vault - should fail', async () => {
        const vaultCondition = ethers.constants.AddressZero;
        const args = {
          communityId,
          condition: vaultCondition,
          metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({}))),
        };
        await assert.rejects(createTransaction('CreateVault', args, alice, habitat), /OCV1/);
      });

      it('register voting module with wrong type - should fail', async () => {
        const condition = conditions['FeatureFarmSignaling'];
        const args = [
          0,
          condition,
          ethers.utils.keccak256(await rootProvider.send('eth_getCode', [condition, 'latest'])),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({})))
        ];

        await assertRevert(bridge.registerModule(...args, { gasLimit: GAS_LIMIT }));
      });

      it('register voting module with wrong codeHash - should fail', async () => {
        const condition = conditions['FeatureFarmSignaling'];
        const args = [
          1,
          condition,
          ethers.utils.keccak256('0xff'),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({})))
        ];

        await assertRevert(bridge.registerModule(...args, { gasLimit: GAS_LIMIT }));
      });

      it('register voting module with invalid contract - should fail', async () => {
        const condition = bridge.address;
        const args = [
          1,
          condition,
          ethers.utils.keccak256(await rootProvider.send('eth_getCode', [condition, 'latest'])),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({})))
        ];

        await assertRevert(bridge.registerModule(...args, { gasLimit: GAS_LIMIT }));
      });

      it('register voting module with address zero - should fail', async () => {
        const condition = ethers.constants.AddressZero;
        const args = [
          1,
          condition,
          ethers.utils.keccak256(await rootProvider.send('eth_getCode', [condition, 'latest'])),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({})))
        ];

        await assertRevert(bridge.registerModule(...args, { gasLimit: GAS_LIMIT }));
      });

      it('register voting modules', async () => {
        for (const conditionName in conditions) {
          const condition = conditions[conditionName];
          const expectRevert = !!deployedConditions[condition];
          const args = [
            1,
            condition,
            ethers.utils.keccak256(await rootProvider.send('eth_getCode', [condition, 'latest'])),
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({})))
          ];

          const oldBlock = await habitatNode.getBlockNumber();
          const tx = await bridge.registerModule(...args);
          const receipt = await tx.wait();
          assert.equal(receipt.status, '0x1', conditionName);
          assert.equal(receipt.logs.length, 1);
          deployedConditions[condition] = true;

          {
            await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());
            const customMessageBlock = await habitat.provider.send('eth_getBlockByNumber', [oldBlock, true]);
            const [tx] = customMessageBlock.transactions;
            assert.equal(tx.primaryType, 'CustomBlockBeacon');

            const receipt = await habitat.provider.send('eth_getTransactionReceipt', [tx.hash]);
            assert.equal(receipt.status, expectRevert ? '0x0' : '0x1', 'tx status');
            assert.equal(receipt.logs.length, expectRevert ? 0 : 1, '# logs');
          }
        }
      });

      it('alice: create a vault - should fail, wrong communityId', async () => {
        const vaultCondition = ethers.constants.AddressZero;
        const args = {
          communityId: '0x' + BigInt.asUintN(256, BigInt(communityId) * 2n).toString(16).padStart(64, '0'),
          condition: vaultCondition,
          metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({}))),
        };
        await assert.rejects(createTransaction('CreateVault', args, alice, habitat), /OCV1/);
      });


      // try deposit to vault & check tvl
      {
        let vault;
        it('alice: create a vault', async () => {
          const moduleName = 'SevenDayVoting';
          const args = {
            communityId,
            condition: conditions[moduleName],
            metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({}))),
          };
          const { txHash, receipt } = await createTransaction('CreateVault', args, alice, habitat);
          assert.equal(receipt.status, '0x1');
          assert.equal(receipt.logs.length, 2);
          const evt = habitat.interface.parseLog(receipt.logs[0]).args;
          assert.equal(evt.communityId, args.communityId);
          assert.equal(evt.condition, args.condition);

          vault = evt.vaultAddress;
          vaults.push(vault);
        });

        it('submitBlock', () => submitBlock(bridge, rootProvider, habitatNode));

        it('deposit to vault: alice', async () => {
          await doDeposit(alice, vault);
        });
      }

      function votingRound (moduleName) {
        describe(`${moduleName} voting`, () => {
          function delegate (from, to, amount) {
            it(`${aliases[from.address]}: delegateTo (${aliases[to.address]}, ${amount})`, async () => {
              let expectedError;
              const stake = await habitat.callStatic.getActiveDelegatedVotingStake(erc20.address, to.address);

              if (from.address === to.address) {
                expectedError = /ODA1/;
              }
              if (amount > balances[from.address]) {
                expectedError = /ODA2/;
              }
              if (stake.gt(amount)) {
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

          let vault;
          it('alice: create a vault', async () => {
            const args = {
              communityId,
              condition: conditions[moduleName],
              metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({}))),
            };
            const { txHash, receipt } = await createTransaction('CreateVault', args, alice, habitat);
            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 2);
            const evt = habitat.interface.parseLog(receipt.logs[0]).args;
            assert.equal(evt.communityId, args.communityId);
            assert.equal(evt.condition, args.condition);

            vault = evt.vaultAddress;
            vaults.push(vault);
          });

          it('create execution proxy for vault', async () => {
            const tx = await executionProxy.createProxy(bridge.address, vault);
            const receipt = await tx.wait();

            assert.equal(receipt.events.length, 1, '# log events');
            const evt = receipt.events[0].args;
            assert.equal(evt.bridge, bridge.address, 'bridge');
            assert.equal(evt.vault, vault, 'vault');
            executionProxyForVault[vault] = evt.proxy;
          });

          let proposalId;
          let internalActions;
          let externalActions = encodeExternalProposalActions([charlie.address, '0x']);
          it('create proposal for first vault', async () => {
            const startDate = ~~(Date.now() / 1000);
            // token transfer
            internalActions = encodeInternalProposalActions(['0x01', erc20.address, charlie.address, '0xfa']);
            const args = {
              startDate,
              vault,
              internalActions,
              externalActions,
              metadata: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify({ title: 'hello world' }))),
            };

            {
              // should fail
              await setTime(startDate - 100_000);
              await assert.rejects(createTransaction('CreateProposal', args, alice, habitat), /VT2/);
              // ditto
              await setTime(startDate + 100_000);
              await assert.rejects(createTransaction('CreateProposal', args, alice, habitat), /VT1/);
            }

            await setTime(startDate);
            const { txHash, receipt } = await createTransaction('CreateProposal', args, alice, habitat);

            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 1);
            const evt = habitat.interface.parseLog(receipt.logs[0]).args;
            proposalId = evt.proposalId;

            proposals.push({ vault, proposalId, internalActions, externalActions, valid: moduleName !== 'FeatureFarmSignaling' ? true : false });
          });

          it('process proposal should fail - invalid proposal', async () => {
            const args = {
              proposalId: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
              internalActions,
              externalActions,
            };
            await assert.rejects(createTransaction('ProcessProposal', args, alice, habitat), /GVC1/);
          });

          it('process proposal - should remain open', async () => {
            const args = {
              proposalId,
              internalActions,
              externalActions,
            };
            const { txHash, receipt } = await createTransaction('ProcessProposal', args, alice, habitat);
            assert.equal(receipt.status, '0x1');
            assert.equal(receipt.logs.length, 0, 'no update');
          });

          async function getPreviousVotingShares (proposalId, account) {
            const filter = habitat.filters.VotedOnProposal(account, proposalId);
            filter.toBlock = 1;
            filter.maxResults = 1;
            const logs = await habitat.provider.send('eth_getLogs', [filter]);
            if (logs.length) {
              const log = habitat.interface.parseLog(logs[0]);
              return BigInt(log.args.shares);
            }
            return 0n;
          }

          async function getPreviousDelegateeVotingShares (proposalId, account) {
            const filter = habitat.filters.DelegateeVotedOnProposal(account, proposalId);
            filter.toBlock = 1;
            filter.maxResults = 1;
            const logs = await habitat.provider.send('eth_getLogs', [filter]);
            if (logs.length) {
              const log = habitat.interface.parseLog(logs[0]);
              return BigInt(log.args.shares);
            }
            return 0n;
          }

          function vote (wallet, shares, signalStrength = 100, wrongProposalId) {
            it(`${aliases[wallet.address]}: vote on proposal (shares=${shares}, signalStrength=${signalStrength})`, async () => {
              const args = {
                proposalId: wrongProposalId || proposalId,
                signalStrength,
                shares,
                delegatedFor: ethers.constants.AddressZero,
              };
              const previousVote = await getPreviousVotingShares(proposalId, wallet.address);
              const activeVotingStake = BigInt(await habitat.callStatic.getActiveVotingStake(erc20.address, wallet.address));
              const delegatedAmount = delegatedShares[wallet.address] || 0n;
              const availableBalance = ((balances[wallet.address] || 0n) - (activeVotingStake + delegatedAmount)) + previousVote;
              let expectedError;
              if (availableBalance < args.shares) {
                expectedError = /OVOP1/;
              }
              if (args.shares === 0n && args.signalStrength !== 0) {
                expectedError = /VR2/;
              }
              if (args.signalStrength > 100) {
                expectedError = /VR1/;
              }
              if (wrongProposalId) {
                expectedError = /GTOP1/;
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
                  const stake = await habitat.callStatic.getActiveVotingStake(erc20.address, evt.account);
                  assert.equal(stake.toString(), args.shares.toString(), 'stake');
                }
              }
            });
          }
          // vote on non-existent proposal
          vote(alice, 3n, 2, ethers.utils.hexlify(ethers.utils.randomBytes(32)));
          vote(alice, 3n, 104);
          vote(alice, 3n);
          vote(alice, depositAmount);
          vote(alice, 0n);
          vote(alice, 9n);
          // vote same shares but change signal strength
          vote(alice, 9n, 99);
          vote(alice, 0n, 0);
          vote(alice, depositAmount - 10000n);

          function delegatedVote (from, delegatee, shares, signalStrength = 100, wrongProposalId) {
            const nameFrom = aliases[from.address];
            const nameTo = aliases[delegatee.address];
            it(`${nameFrom}: vote on proposal as delegate ${nameTo} (shares=${shares},signal=${signalStrength})`, async () => {
              const args = {
                proposalId: wrongProposalId || proposalId,
                signalStrength,
                shares: shares,
                delegatedFor: delegatee.address,
              };
              const delegatedAmount = delegatedShares[delegatee.address] || 0n;
              let expectedError;
              if (from.address === delegatee.address) {
                const previousVote = await getPreviousDelegateeVotingShares(proposalId, from.address);
                if (shares + leftOverStake > delegatedAmount) {
                  expectedError = /ODVOP2/;
                }
                if ((shares === 0n && signalStrength !== 0) || (shares === 0n && previousVote === 0n)) {
                  expectedError = /VR2/;
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
              if (args.signalStrength > 100) {
                expectedError = /VR1/;
              }
              if (wrongProposalId) {
                expectedError = /GTOP1/;
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
                  const stake = await habitat.callStatic.getActiveDelegatedVotingStake(erc20.address, evt.args.account);
                  // only replaces the vote with the same amount, should have the same stake
                  assert.equal(stake.toString(), (shares + leftOverStake).toString(), 'stake');
                }
              }
            });
          }

          // vote on non-existent proposal
          delegatedVote(bob, bob, 2n, 100, ethers.utils.hexlify(ethers.utils.randomBytes(32)));
          delegatedVote(bob, bob, 2n, 101);
          delegatedVote(bob, bob, 0n, 0);
          delegatedVote(bob, bob, 22n);
          delegatedVote(bob, bob, 0n);
          delegatedVote(bob, bob, 0xffn);
          delegatedVote(bob, bob, 0xffffn);
          // vote same shares but change signal strength
          delegatedVote(bob, bob, 0xffffn, 99);
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
            assert.equal(receipt.logs.length, 0, 'no update');
          });

          // we are submitting this block to avoid time-based errors later in the timestamp checks
          it('submitBlock', () => submitBlock(bridge, rootProvider, habitatNode));

          it('setTime', async () => {
            await setTime(~~(Date.now() / 1000) + (3600 * 24 * 7));
          });

          if (moduleName !== 'FeatureFarmSignaling') {
            it('process proposal - should revert, vault has no balance', async () => {
              const args = {
                proposalId,
                internalActions,
                externalActions,
              };
              await assert.rejects(createTransaction('ProcessProposal', args, alice, habitat), /LOCK/);
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
                balances[charlie.address] += BigInt(evt.value.toString());
              }
              {
                const evt = habitat.interface.parseLog(receipt.logs[1]).args;
                assert.equal(Number(evt.votingStatus), 3);
              }

              // transfer from vault to user
              cumulativeDeposits += 0xfan;
            });
          } else {
            it('process proposal - should still be open', async () => {
              const args = {
                proposalId,
                internalActions,
                externalActions,
              };
              const { txHash, receipt } = await createTransaction('ProcessProposal', args, alice, habitat);
              assert.equal(receipt.status, '0x1');
              assert.equal(receipt.logs.length, 0);
            });
          }

          vote(alice, 0n, 0);

          it('decrement leftover stake', () => {
            leftOverStake--;
          });

          delegatedVote(alice, bob, 0n, 0);
        });
      }

      votingRound('SevenDayVoting');
      votingRound('OneThirdParticipationThreshold');
      votingRound('FeatureFarmSignaling');

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

      describe(`staking rewards`, () => {
        const operatorAmount = 2319n;
        const divisor = 100n;
        const expectedFee = operatorAmount / divisor;
        const expectedRewards = {
          // epoch
          '1': {
            [alice.address]: 9n,
            [bob.address]: 9n,
            [charlie.address]: 11n,
            [eva.address]: 17n,
          },
          // epoch
          '24': {
            [alice.address]: 9n,
            [bob.address]: 0n,
            [charlie.address]: 2n,
            [eva.address]: 35n,
          },
          // eva accrues more value
          '256': {
            [alice.address]: 5n,
            [bob.address]: 5n,
            [charlie.address]: 7n,
            [eva.address]: 29n,
          },
          '279': {
            [alice.address]: 5n,
            [bob.address]: 0n,
            [charlie.address]: 2n,
            [eva.address]: 39n,
          },
        };
        let activeEpoch = 0;

        function tribute (wallet) {
          const walletName = aliases[wallet.address];

          it(`${walletName}: TributeForOperator`, async () => {
            const args = {
              operator: eva.address,
              amount: operatorAmount,
              token: erc20.address,
            };

            const { receipt } = await createTransaction('TributeForOperator', args, wallet, habitat);
            assert.equal(receipt.status, '0x1');

            {
              // fee transfer
              const log = habitat.interface.parseLog(receipt.logs[0]);
              assert.equal(BigInt(log.args.value), expectedFee, 'fee');
              assert.equal(log.args.from, wallet.address, 'from');
              const poolAddr = '0x' + activeEpoch.toString(16).padStart(40, '0');
              assert.equal(log.args.to, poolAddr, 'to');
              balances[poolAddr] = (balances[poolAddr] || 0n) + expectedFee;
            }
            {
              const log = habitat.interface.parseLog(receipt.logs[1]);
              assert.equal(BigInt(log.args.value), operatorAmount - expectedFee, 'fee');
              assert.equal(log.args.from, wallet.address, 'from');
              assert.equal(log.args.to, args.operator, 'to');
            }

            balances[wallet.address] -= args.amount;
            balances[args.operator] = (balances[args.operator] || 0n) + (args.amount - expectedFee);
          });
        }

        it('increment epoch', async () => {
          startEpoch = endEpoch;
          endEpoch += 0xff;
          activeEpoch = startEpoch;
          const data = '0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14'
            + startEpoch.toString(16).padStart(64, '0');
          const args = {
            data,
          };
          const { receipt } = await createTransaction('ModifyRollupStorage', args, alice, habitat);
          assert.equal(receipt.status, '0x1');

          const newEpoch = BigInt(await habitat.callStatic.getCurrentEpoch());
          assert.equal(newEpoch, startEpoch);
        });

        it('transfer alice > [bob, charlie]', async () => {
          for (const wallet of [bob, charlie]) {
            const args = {
              token: erc20.address,
              to: wallet.address,
              value: (operatorAmount * 2n) + 37n,
            };
            const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
            assert.equal(receipt.logs.length, 1, '#logs');
            balances[alice.address] -= args.value;
            balances[wallet.address] += args.value;
          }
        });

        it('exit: alice - should fail, delegated amount', async () => {
          const args = {
            token: erc20.address,
            to: ethers.constants.AddressZero,
            value: balances[alice.address],
          };
          await assert.rejects(createTransaction('TransferToken', args, alice, habitat), /LOCK/);
        });

        it('alice: reduce delegated amount', async () => {
          const args = {
            delegatee: bob.address,
            token: erc20.address,
            value: leftOverStake,
          };
          const { receipt } = await createTransaction('DelegateAmount', args, alice, habitat);
          assert.equal(receipt.logs.length, 1, '#logs');
        });

        it('alice: exit', async () => {
          const args = {
            token: erc20.address,
            to: ethers.constants.AddressZero,
            value: balances[alice.address] - leftOverStake - operatorAmount,
          };
          const { txHash, receipt } = await createTransaction('TransferToken', args, alice, habitat);
          assert.equal(receipt.logs.length, 1, '#logs');
          balances[alice.address] -= args.value;
          cumulativeDeposits -= args.value;
        });

        // first tributes
        for (const wallet of [bob, charlie]) {
          tribute(wallet);
        }

        it('after first tribute', async () => {
          console.log(balances, { activeEpoch, startEpoch, endEpoch});
        });

        for (const wallet of [bob, charlie]) {
          const walletName = aliases[wallet.address];
          it(`${walletName}: claim reward - fail, epoch not closed yet`, async () => {
            const args = {
              token: erc20.address,
              sinceEpoch: activeEpoch,
            };
            await assert.rejects(createTransaction('ClaimStakingReward', args, wallet, habitat), /OCSR1/);
          });
        }

        it('set epoch', async () => {
          activeEpoch = startEpoch + 23;
          const data = '0x072512b50f96eebc18b80fcb796fd1878d108cab3f9601c23c8c01ab32315d14'
            + activeEpoch.toString(16).padStart(64, '0');
          const args = {
            data,
          };
          const { receipt } = await createTransaction('ModifyRollupStorage', args, alice, habitat);
          assert.equal(receipt.status, '0x1');
        });

        // second tribute
        for (const wallet of [bob, charlie]) {
          tribute(wallet);
        }

        it('after second tribute', async () => {
          console.log(balances, { activeEpoch, startEpoch, endEpoch});
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

        for (const wallet of [alice, bob, charlie, eva]) {
          const walletName = aliases[wallet.address];

          it(`${walletName}: claim reward`, async () => {
            for (let epoch = startEpoch; epoch < endEpoch; epoch += 10) {
              const args = {
                token: erc20.address,
                sinceEpoch: epoch,
              };
              let claimableEpochs = 10;
              if (epoch + claimableEpochs > endEpoch) {
                claimableEpochs = (endEpoch) - epoch;
              }

              const { receipt } = await createTransaction('ClaimStakingReward', args, wallet, habitat);
              let rewardEvents = 0;
              let logEpoch = epoch;
              for (let i = 0, len = receipt.logs.length; i < len; i++) {
                const log = habitat.interface.parseLog(receipt.logs[i]).args;

                const expectedReward = expectedRewards[logEpoch] ? expectedRewards[logEpoch][wallet.address] : 0n;
                if (!expectedReward) {
                  assert.equal(Number(log.epoch), logEpoch, 'epoch');
                  logEpoch++;
                  continue;
                }

                assert.equal(BigInt(log.value), expectedReward, 'fee');
                assert.equal(log.to, wallet.address, 'to');
                assert.equal(log.from, '0x' + logEpoch.toString(16).padStart(40, '0'), 'from');
                {
                  const log = habitat.interface.parseLog(receipt.logs[++i]).args;
                  assert.equal(BigInt(log.amount), expectedReward, 'reward');
                  assert.equal(log.account, wallet.address, 'account');
                }
                rewardEvents++;
                logEpoch++;
                // balance of wallet should increase by reward
                balances[wallet.address] += expectedReward;
                balances[log.from] -= expectedReward;
              }
              assert.equal(receipt.logs.length, claimableEpochs + rewardEvents, '#log events');
            }
          });

          it(`${walletName}: claim reward second time should fail`, async () => {
            const args = {
              token: erc20.address,
              sinceEpoch: startEpoch,
            };
            await assert.rejects(createTransaction('ClaimStakingReward', args, wallet, habitat), /OCSR1/);
          });
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

          const proxy = new ethers.Contract(executionProxyForVault[vault], ExecutionProxy.abi, alice);
          let expected = valid; //args.actions === validAction;
          // try to execute
          let result;
          if (expected) {
            const tx = await proxy.execute(proposalId, externalActions);
            const receipt = await tx.wait();
            result = !!receipt.status;
          } else {
            await assertRevert(proxy.execute(proposalId, externalActions, { gasLimit: GAS_LIMIT }));
            result = false;
          }

          assert.equal(result, expected, 'expected execution result via proxy');

          if (expected) {
            // a second time should fail
            await assertRevert(proxy.execute(proposalId, externalActions, { gasLimit: GAS_LIMIT }));
          }

          // non existent permit should fail
          await assertRevert(proxy.execute(ethers.utils.keccak256('0xff'), '0x', { gasLimit: GAS_LIMIT }));
        }
      });
    });
  }

  describe('chain - challenge', function () {
    doRound();
    describe('finalize', function () {
      it('submitBlock', () => submitBlockUntilEmpty(bridge, rootProvider, habitatNode));
      it('doChallenge', () => doChallenge(bridge, rootProvider, habitatNode));
      it('debugStorage', () => debugStorage(bridge, rootProvider, habitatNode));
    });
    doExecutionTest();
  });

  describe('chain - forward', function () {
    doRound();
    describe('finalize', function () {
      it('submitBlock', () => submitBlockUntilEmpty(bridge, rootProvider, habitatNode));
      it('doForward', () => doForward(bridge, rootProvider, habitatNode));
      it('debugStorage', () => debugStorage(bridge, rootProvider, habitatNode));
    });
    doExecutionTest();
  });
});
