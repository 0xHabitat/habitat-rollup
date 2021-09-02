import ethers from 'ethers';
import TYPED_DATA from '../habitatV1.js';
import {
  createTransaction,
  signPermit,
} from './utils.js';

describe('VirtualERC20', async function () {
  const {
    VirtualERC20FactoryMock,
    HabitatV1Mock,
    RollupProxy,
  } = Artifacts;
  const { rootProvider, alice, bob, charlie, eva } = getDefaultWallets();
  let virtualFactory;
  let rollupImplementation;
  let rollupProxy;
  let bridge;
  let habitat;
  let habitatNode;

  before('Prepare contracts', async () => {
    rollupImplementation = await deploy(HabitatV1Mock, alice);
    rollupProxy = await deploy(RollupProxy, alice, rollupImplementation.address);
    bridge = new ethers.Contract(rollupProxy.address, HabitatV1Mock.abi, alice);
    virtualFactory = await deploy(VirtualERC20FactoryMock, alice, bridge.address);

    habitatNode = await startNode('../../v1/lib/index.js', 9999, 0, bridge.address, TYPED_DATA);
    habitat = bridge.connect(habitatNode);
  });

  let rounds = 0;

  function doRound (challengeMode = false) {
    describe('round', async () => {
      const name = 'My Token';
      const symbol = 'MYTKN';
      const decimals = ++rounds;
      const totalSupply = 1000n;
      let domainSeparator;
      let erc;

      it('compute domain separator', async () => {
        const chainId = (await alice.provider.getNetwork()).chainId;
        const domainHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EIP712Domain(string name,uint256 chainId)'));
        const tokenNameHash = ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.toUtf8Bytes(name)]);
        domainSeparator = ethers.utils.keccak256(
          ethers.utils.hexConcat(
            [
              domainHash,
              tokenNameHash,
              '0x' + chainId.toString(16).padStart(64, '0')
            ]
          )
        );
      });

      it('create', async () => {
        const addr = await virtualFactory.callStatic.createProxy(name, symbol, decimals, totalSupply, domainSeparator);
        const tx = await virtualFactory.createProxy(name, symbol, decimals, totalSupply, domainSeparator);
        const receipt = await tx.wait();

        assert.equal(receipt.status, 1);
        assert.equal(receipt.events[0].args.proxy, addr);

        erc = new ethers.Contract(addr, virtualFactory.interface, alice);
      });

      it('create a second time - should fail', async () => {
        await assert.rejects(virtualFactory.createProxy(name, symbol, decimals, totalSupply, domainSeparator), /CP1/);
      });

      it('init a second time - should fail', async () => {
        await assert.rejects(erc.init(bridge.address), /S1/);
      });

      it('name', async () => {
        const _name = await erc.name();
        assert.equal(_name, name);
      });

      it('symbol', async () => {
        const _symbol = await erc.symbol();
        assert.equal(_symbol, symbol);
      });

      it('DOMAIN_SEPARATOR', async () => {
        const _domainSeparator = await erc.DOMAIN_SEPARATOR();
        assert.equal(_domainSeparator, domainSeparator);
      });

      it('totalSupply', async () => {
        const _supply = await erc.totalSupply();
        assert.equal(BigInt(_supply), BigInt.asUintN(256, totalSupply));
      });

      it('initial balance', async () => {
        const balance = await erc.balanceOf(bridge.address);
        assert.equal(BigInt(balance), BigInt(totalSupply));
      });

      describe('rollup', () => {
        let args;

        it('args', async () => {
          args = {
            factoryAddress: virtualFactory.address,
            args: ethers.utils.defaultAbiCoder.encode(
              ['string', 'string', 'uint8', 'uint256', 'bytes32'],
              [name, symbol, decimals, totalSupply, domainSeparator]
            ),
          };
        });

        it('create virtual erc-20', async () => {
          const { tx, receipt } = await createTransaction('CreateVirtualERC20', args, alice, habitat);
          assert.equal(receipt.events.find((e) => e.name === 'VirtualERC20Created').args.token, erc.address);
        });

        it('create virtual erc-20 a second time - should fail', async () => {
          await assert.rejects(createTransaction('CreateVirtualERC20', args, alice, habitat), /OCVE2/);
        });

        it('check balance/tvl', async () => {
          const balance = await habitat.callStatic.getBalance(erc.address, alice.address);
          const tvl = await habitat.callStatic.getTotalValueLocked(erc.address);
          assert.equal(BigInt(balance), totalSupply);
          assert.equal(BigInt(tvl), totalSupply);
        });

        it('withdraw tokens', async () => {
          const args = {
            token: erc.address,
            value: totalSupply,
            to: ethers.constants.AddressZero,
          };
          const { tx, receipt } = await createTransaction('TransferToken', args, alice, habitat);
        });

        it('check exit - should be zero', async () => {
          const x = await bridge.getERC20Exit(erc.address, alice.address);
          assert.equal(BigInt(x), 0n);
        });

        it('submitBlock', () => submitBlockUntilEmpty(bridge, rootProvider, habitatNode));
        if (challengeMode) {
          it('doChallenge', () => doChallenge(bridge, rootProvider, habitatNode));
        } else {
          it('doForward', () => doForward(bridge, rootProvider, habitatNode));
        }

        it('check exit & withdraw', async () => {
          {
            const x = await bridge.getERC20Exit(erc.address, alice.address);
            assert.equal(BigInt(x), totalSupply);
          }

          {
            const tx = await bridge.withdraw(alice.address, erc.address, 0);
            const receipt = await tx.wait();
            assert.equal(receipt.status, 1);
          }

          {
            const x = await bridge.getERC20Exit(erc.address, alice.address);
            assert.equal(BigInt(x), 0n);
          }

        });

        it('check tvl on rollup', async () => {
          const tvl = await habitat.callStatic.getTotalValueLocked(erc.address);
          assert.equal(BigInt(tvl), 0n);
        });

        it('check balance on l1', async () => {
          {
            const balance = await erc.balanceOf(bridge.address);
            assert.equal(BigInt(balance), 0n);
          }
          {
            const balance = await erc.balanceOf(alice.address);
            assert.equal(BigInt(balance), BigInt(totalSupply));
          }
        });

        it('deposit again - should fail (allowance)', async () => {
          await assert.rejects(bridge.deposit(erc.address, 500n, alice.address), /reverted/);
        });

        it('deposit again w/ approval', async () => {
          {
            const tx = await erc.approve(bridge.address, 500n);
            await tx.wait();
          }
          const oldBlock = await habitatNode.getBlockNumber();
          const tx = await bridge.deposit(erc.address, 500n, alice.address);
          const receipt = await tx.wait();
          await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());
        });

        it('deposit again w/ permit', async () => {
          {
            const { permitData } = await signPermit(erc, alice, bridge.address, 500n);
            const tx = await alice.sendTransaction({ to: erc.address, data: permitData });
            await tx.wait();
          }

          const oldBlock = await habitatNode.getBlockNumber();
          const tx = await bridge.deposit(erc.address, 500n, alice.address);
          const receipt = await tx.wait();
          await waitForValueChange(oldBlock, () => habitatNode.getBlockNumber());
        });

        it('check balances', async () => {
          {
            const balance = await erc.balanceOf(bridge.address);
            assert.equal(BigInt(balance), totalSupply);
          }
          {
            const balance = await erc.balanceOf(alice.address);
            assert.equal(BigInt(balance), 0n);
          }

          const balance = await habitat.callStatic.getBalance(erc.address, alice.address);
          const tvl = await habitat.callStatic.getTotalValueLocked(erc.address);
          assert.equal(BigInt(balance), totalSupply);
          assert.equal(BigInt(tvl), totalSupply);
        });
      });
    });
  }

  describe('chain - challenge', function () {
    doRound(true);
    describe('finalize', function () {
      it('submitBlock', () => submitBlockUntilEmpty(bridge, rootProvider, habitatNode));
      it('doChallenge', () => doChallenge(bridge, rootProvider, habitatNode));
      it('debugStorage', () => debugStorage(bridge, rootProvider, habitatNode));
    });
  });

  describe('chain - forward', function () {
    doRound(false);
    describe('finalize', function () {
      it('submitBlock', () => submitBlockUntilEmpty(bridge, rootProvider, habitatNode));
      it('doForward', () => doForward(bridge, rootProvider, habitatNode));
      it('debugStorage', () => debugStorage(bridge, rootProvider, habitatNode));
    });
  });
});
