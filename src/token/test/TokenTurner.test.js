import ethers from 'ethers';
import { signPermit, signPermitDai, getRoute } from './helpers.js';

const DEBUG = !!process.env.DEBUG;

describe('TokenTurner', function () {
  const { HabitatToken, TokenTurnerMock, UniswapV2Router, UniswapV2Factory, DAI, WETH } = Artifacts;
  const { rootProvider, alice, bob, charlie } = getDefaultWallets();
  const COMMUNITY_FUND = charlie.address;
  const TRANSFER_AMOUNT = '1000';
  const SUPPLY = 2_000_000n * (10n ** 10n);
  const FUNDING_PRICE = 25n * (10n ** 6n);
  const FUNDING_EPOCHS = 12n;
  const DECAY_PER_EPOCH = 4n;
  const MAX_DECAY_RATE = 100n;
  const MAX_EPOCH = Number(FUNDING_EPOCHS + (MAX_DECAY_RATE / DECAY_PER_EPOCH));
  const ctx = { alice, bob, charlie };
  const decimals = {
    'weth': 18n,
    'dai': 18n,
    'hbt': 10n,
  };

  before('Prepare contracts', async () => {
    ctx.weth = await deploy(WETH, alice);
    ctx.dai = await deploy(DAI, alice);
    ctx.hbt = await deploy(HabitatToken, alice);
    ctx.uniswapFactory = await deploy(UniswapV2Factory, alice, charlie.address);
    ctx.tokenTurner = await deploy(
      TokenTurnerMock, alice, ctx.hbt.address, ctx.dai.address, COMMUNITY_FUND
    );
  });

  function parseAmount (val, tokenName) {
    return BigInt(val) * (10n ** decimals[tokenName]);
  }

  it('mint dai,weth', async () => {
    await (await ctx.dai.mint(alice.address, BigInt.asUintN(128, '-1'))).wait();
    await (await ctx.weth.deposit({ value: parseAmount(10_000, 'weth') })).wait();
  });

  it('create & charge dai-weth pool (1000 : 1)', async () => {
    const pair = await ctx.uniswapFactory.callStatic.createPair(ctx.dai.address, ctx.weth.address);
    await (await ctx.uniswapFactory.createPair(ctx.dai.address, ctx.weth.address)).wait();
    await (await ctx.dai.transfer(pair, parseAmount(500_000n, 'dai'))).wait();
    await (await ctx.weth.transfer(pair, parseAmount(500n, 'weth'))).wait();
    await (await new ethers.Contract(pair, ['function mint(address)'], alice).mint(alice.address)).wait();
  });

  it('charge tokenTurner with supply', async () => {
    await (await ctx.hbt.transfer(ctx.tokenTurner.address, SUPPLY)).wait();

    assert.equal(SUPPLY.toString(), (await ctx.hbt.balanceOf(ctx.tokenTurner.address)).toString());
  });

  it('burn remaining supply', async () => {
    await (await ctx.hbt.transfer(ethers.constants.AddressZero, await ctx.hbt.balanceOf(alice.address))).wait();
  });

  it('WETH>DAI: check output amount', async () => {
    const route = await getRoute(ctx.uniswapFactory, [ctx.weth.address, ctx.dai.address]);
    const amountIn = parseAmount(1n, 'weth');
    const { inflow, outflow } = await ctx.tokenTurner.getQuote(amountIn, route);

    assert.equal(outflow.toString(), '39800637528767', 'expected hbt amount');
  });

  it('DAI: check output amount', async () => {
    const route = await getRoute(ctx.uniswapFactory, [ctx.dai.address]);
    const amountIn = parseAmount(123n, 'dai');
    const { inflow, outflow } = await ctx.tokenTurner.getQuote(amountIn, route);
    const expected = parseAmount(492n, 'hbt');

    assert.equal(outflow.toString(), expected.toString(), 'expected hbt amount');
  });

  it('swapOut - wrong epoch should fail', async () => {
    await assert.rejects(
      ctx.tokenTurner.callStatic.swapOut(alice.address, 1, 124, [ctx.dai.address], '0x'),
      /EPOCH/
    );
  });

  it('swapOut - AMOUNT', async () => {
    const amount = 1;
    const { permitData } = await signPermit(ctx.hbt, alice, ctx.tokenTurner.address, amount);
    await ctx.tokenTurner.setEpoch(100);
    await assert.rejects(
      ctx.tokenTurner.callStatic.swapOut(alice.address, 1, amount, [ctx.dai.address], '0x'),
      /AMOUNT/
    );
  });

  it('swapOut - AMOUNT 2', async () => {
    const amount = 1;
    const { permitData } = await signPermit(ctx.hbt, alice, ctx.tokenTurner.address, amount);
    await ctx.tokenTurner.setEpoch(2);
    await assert.rejects(
      ctx.tokenTurner.callStatic.swapOut(alice.address, 1, amount, [ctx.dai.address], '0x'),
      /AMOUNT/
    );
  });

  it('swapIn - PRESALE_OVER', async () => {
    const amount = 0xffff;
    const { permitData } = await signPermitDai(ctx.dai, alice, ctx.tokenTurner.address, amount);
    await ctx.tokenTurner.setEpoch(100);
    await assert.rejects(
      ctx.tokenTurner.callStatic.swapIn(alice.address, 1, [ctx.dai.address], permitData),
      /PRESALE_OVER/
    );
  });

  it('swapIn - ZERO_AMOUNT', async () => {
    const amount = 0xffff;
    const { permitData } = await signPermitDai(ctx.dai, alice, ctx.tokenTurner.address, amount);
    await ctx.tokenTurner.setEpoch(1);
    await assert.rejects(
      ctx.tokenTurner.callStatic.swapIn(alice.address, 1, [ctx.dai.address], permitData),
      /ZERO_AMOUNT/
    );
  });

  function testEpoch (currentEpoch) {
    describe(`epoch ${currentEpoch}`, () => {
      // keeps track of balances
      let oldBalances = {};
      let expectedDeltas = {};
      async function debugBalance () {
        for (const tokenName in expectedDeltas) {
          const bag = expectedDeltas[tokenName];
          const old = oldBalances[tokenName];
          for (const walletName in bag) {
            const wallet = ctx[walletName];
            const addr = wallet.address;
            const expectedDelta = bag[walletName];
            const oldBalance = old[walletName];
            const newBalance = await ctx[tokenName].balanceOf(addr);
            let diff;
            if (newBalance.gt(oldBalance)) {
              diff = newBalance.sub(newBalance);
            } else {
              diff = newBalance.sub(oldBalance);
            }
            diff = newBalance.sub(oldBalance);
            assert.equal(diff.toString(), expectedDelta.toString(), `${tokenName} ${walletName}`);
          }
        }
        // reset
        expectedDeltas = {};

        {
          if (DEBUG) {
            console.log('+'.repeat(60));
          }
          for (const tokenName of ['dai', 'weth', 'hbt', 'eth']) {
            const bag = oldBalances[tokenName] || {};
            oldBalances[tokenName] = bag;
            for (const walletName of ['alice', 'bob', 'charlie', 'tokenTurner']) {
              const wallet = ctx[walletName];
              const addr = wallet.address;
              let v;
              if (tokenName === 'eth') {
                v = await alice.provider.getBalance(addr);
              } else {
                v = await ctx[tokenName].balanceOf(addr);
              }

              bag[walletName] = v;
              if (DEBUG) {
                console.log(
                  tokenName,
                  walletName,
                  ethers.utils.formatUnits(v, tokenName === 'eth' ? '18' : await ctx[tokenName].decimals())
                );
              }
            }
          }
          if (DEBUG) {
            console.log('-'.repeat(60));
          }
        }

        {
          // checks if the dai balance of token turner is correct in contrast to all available swap outs.
          const tokenTurnerDaiBalance = BigInt(await ctx.dai.balanceOf(ctx.tokenTurner.address));
          let total = 0n;
          let swappable = 0n;
          for (let i = 0; i <= currentEpoch; i++) {
            for (const walletName of ['alice', 'bob', 'charlie']) {
              const wallet = ctx[walletName];
              const { inflow, outflow } = await ctx.tokenTurner.inflowOutflow(i, wallet.address);

              let decay = BigInt((currentEpoch - i)) * DECAY_PER_EPOCH;
              if (decay > MAX_DECAY_RATE) {
                decay = MAX_DECAY_RATE;
              }
              swappable += (BigInt(inflow) - ((BigInt(inflow) / MAX_DECAY_RATE) * decay)) - BigInt(outflow);
              total += BigInt(inflow);
            }
          }
          if (DEBUG) {
            console.log({ total, swappable, tokenTurnerDaiBalance });
          }
          assert.ok(tokenTurnerDaiBalance >= (total - swappable), 'should hold at least');
        }
      }

      function swapInHelper (walletName, _path, amountIn, withETH = false) {
        // a dai permit only allows or disallows a spender
        if (!withETH && _path[0] !== 'dai') {
          it(`${walletName}: can't swapIn without permit/allowance HBT from ${_path} withETH: ${withETH}`, async () => {
            const wallet = ctx[walletName];
            const path = _path.map((e) => ctx[e].address);
            const route = await getRoute(ctx.uniswapFactory, path);

            const tx = await ctx.tokenTurner.connect(wallet).swapIn(
              wallet.address,
              amountIn,
              route,
              '0x',
              { gasLimit: 10_000_000 }
            );
            await assert.rejects(tx.wait());
          });
        }

        it(`${walletName}: can swapIn HBT from ${_path} withETH: ${withETH}`, async () => {
          const wallet = ctx[walletName];
          const token = ctx[_path[0]];
          const inputToken = _path[0];
          const path = _path.map((e) => ctx[e].address);
          const route = await getRoute(ctx.uniswapFactory, path);
          const isDaiInput = _path[0] === 'dai';
          let permitData = '0x';

          if (isDaiInput) {
            permitData = (await signPermitDai(ctx.dai, wallet, ctx.tokenTurner.address, amountIn)).permitData;
          } else {
            // classic approve
            await (await token.connect(wallet).approve(ctx.tokenTurner.address, amountIn)).wait();
          }

          const { inflow, outflow } = await ctx.tokenTurner.getQuote(amountIn, route);
          if (isDaiInput) {
            assert.equal(amountIn.toString(), inflow.toString(), 'input amount');
          }
          // maybe inexact due to rounding
          assert.ok((BigInt(outflow) * FUNDING_PRICE) <= BigInt(inflow), 'price');

          const outputTokenBalance = await ctx.hbt.balanceOf(ctx.tokenTurner.address);
          const tx = await ctx.tokenTurner.connect(wallet).swapIn(
            wallet.address,
            amountIn,
            route,
            permitData,
            { value: withETH ? amountIn : 0, gasLimit: 10_000_000 }
          );
          if (outputTokenBalance.lt(outflow)) {
            console.log('should fail');
            await assert.rejects(tx.wait());
            return;
          }

          const receipt = await tx.wait();
          console.log(Number(receipt.gasUsed).toLocaleString());
          const [evt] = receipt.events.filter((e) => e.event === 'Buy');

          assert.equal(evt.args.buyer, wallet.address, 'buyer');
          assert.equal(evt.args.epoch.toString(), currentEpoch.toString(), 'epoch');
          assert.equal(evt.args.amount.toString(), outflow.toString(), 'output token amount');

          const inputAmount = inputToken === 'dai' ? amountIn : inflow;
          expectedDeltas = {
            'hbt': {
              [walletName]: BigInt(outflow),
              ['tokenTurner']: -BigInt(outflow),
            },
            'dai': {
              ['tokenTurner']: BigInt(inputAmount),
            }
          }

          {
            const expectedHBT = BigInt(inputAmount) / FUNDING_PRICE;
            assert.equal(evt.args.amount.toString(), expectedHBT.toString(), 'expected outflow');
          }
        });
      }

      function swapOutHelper (walletName, _path, amountIn, _epoch = currentEpoch, withETH = false) {
        it(`${walletName}: can't swapOut HBT to ${_path} withETH: ${withETH} without permit`, async () => {
          const wallet = ctx[walletName];
          const path = _path.map((e) => ctx[e].address);
          const route = await getRoute(ctx.uniswapFactory, path);
          route[0] = withETH ? ctx.weth.address : 0;
          const tx = await ctx.tokenTurner.swapOut(
            wallet.address,
            amountIn,
            _epoch,
            route,
            '0x',
            { gasLimit: 10_000_000 }
          );
          await assert.rejects(tx.wait());
        });

        it(`${walletName}: can swapOut HBT to ${_path} withETH: ${withETH} epoch: ${_epoch}`, async () => {
          const wallet = ctx[walletName];
          const permit = await signPermit(ctx.hbt, wallet, ctx.tokenTurner.address, amountIn);
          const path = _path.map((e) => ctx[e].address);
          const route = await getRoute(ctx.uniswapFactory, path);
          route[0] = withETH ? ctx.weth.address : 0;
          const args = [
            wallet.address,
            amountIn,
            _epoch,
            route,
            permit.permitData
          ];
          const tx = await ctx.tokenTurner.swapOut(
            ...args,
            { gasLimit: 10_000_000 }
          );
          const receipt = await tx.wait();
          console.log(Number(receipt.gasUsed).toLocaleString());
          const [evt] = receipt.events.filter((e) => e.event === 'Sell');

          assert.equal(evt.args.seller, wallet.address, 'seller');
          assert.equal(evt.args.epoch.toString(), _epoch.toString(), 'epoch');
          assert.equal(evt.args.amount.toString(), amountIn.toString(), 'sold amount');

          expectedDeltas = {
            'hbt': {
              [walletName]: -BigInt(amountIn),
              ['tokenTurner']: BigInt(amountIn),
            },
            'dai': {
              ['tokenTurner']: -(amountIn * FUNDING_PRICE),
            }
          }
        });
      }

      beforeEach(debugBalance);
      afterEach(debugBalance);

      it(`set epoch to ${currentEpoch}`, async () => {
        await ctx.tokenTurner.setEpoch(currentEpoch);
      });

      it('claims any decay', async () => {
        const daiBalance = await ctx.dai.balanceOf(ctx.tokenTurner.address);
        const tx = await ctx.tokenTurner.updateEpoch();
        const receipt = await tx.wait();
        const claimEvents = receipt.events.filter((e) => e.event === 'Claim');

        assert.equal(claimEvents.length, currentEpoch > 0 ? 1 : 0, 'claim events');
        if (currentEpoch > 0) {
          const { epoch, amount } = claimEvents[0].args;
          assert.equal(epoch.toString(), currentEpoch.toString(), 'expected epoch');

          console.log({epoch,amount});
          const expectedAmount = epoch < MAX_EPOCH ?
            daiBalance.div(MAX_DECAY_RATE).mul(DECAY_PER_EPOCH) : daiBalance;
          assert.equal(amount.toString(), expectedAmount.toString(), 'claim amount');
        }
      });

      swapInHelper('alice', ['dai'], parseAmount(50n, 'dai'));
      swapInHelper('alice', ['weth', 'dai'], parseAmount(3n, 'weth'));
      swapInHelper('alice', ['weth', 'dai'], parseAmount(2n, 'weth'), true);
      swapOutHelper('alice', ['dai'], parseAmount(123n, 'hbt'), currentEpoch);
      swapOutHelper('alice', ['dai', 'weth', 'dai'], parseAmount(12n, 'hbt'), currentEpoch);
      swapInHelper('alice', ['dai'], parseAmount(1_412n, 'dai'));
      swapInHelper('bob', ['weth', 'dai'], parseAmount(1n, 'weth'), true);

      if (currentEpoch > 0) {
        // swap-out for previous epochs
        for (let i = 0; i < currentEpoch; i++) {
          swapOutHelper('alice', ['dai'], parseAmount(3n, 'hbt'), i);
          swapOutHelper('alice', ['dai', 'weth'], parseAmount(2n, 'hbt'), i);
          swapOutHelper('alice', ['dai', 'weth'], parseAmount(1n, 'hbt'), i, true);
        }
      }

      it('transfer ETH to token turner should fail', async () => {
        const tx = await alice.sendTransaction({ to: ctx.tokenTurner.address, value: 1, gasLimit: 10_000_000 });
        await assert.rejects(tx.wait());
      });

      describe('token recovery', () => {
        const amount = 0xff;
        let balanceBefore;

        it('transfer tokens to token turner', async () => {
          balanceBefore = await ctx.weth.balanceOf(charlie.address);
          await ctx.weth.transfer(ctx.tokenTurner.address, amount);
        });

        it('recover input should fail with outputToken', async () => {
          const tx = await ctx.tokenTurner.recoverLostTokens(ctx.hbt.address, { gasLimit: 10_000_000 });
          await assert.rejects(tx.wait());
        });

        it('recover output should fail with inputToken', async () => {
          const tx = await ctx.tokenTurner.recoverLostTokens(ctx.dai.address, { gasLimit: 10_000_000 });
          await assert.rejects(tx.wait());
        });

        it('recover lost tokens', async () => {
          await (await ctx.tokenTurner.recoverLostTokens(ctx.weth.address)).wait();
          assert.equal((await ctx.weth.balanceOf(charlie.address)).toString(), balanceBefore.add(amount).toString());
        });
      });
    });
  }

  for (let i = 0; i < 9; i++) {
    testEpoch(i);
  }
});
