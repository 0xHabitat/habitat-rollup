import ethers from 'ethers';
import { signPermit } from './helpers.js';

describe('HabitatToken', function () {
  const { HabitatToken, CallMock } = Artifacts;
  const { alice, bob, charlie } = getDefaultWallets();
  const TRANSFER_AMOUNT = '1000';
  const INITIAL_SUPPLY = 100_000_000;
  let hbt;
  let other;
  let callMock;

  before('Prepare contracts', async () => {
    hbt = await deploy(HabitatToken, alice);
    other = await deploy(HabitatToken, alice);
    callMock = await deploy(CallMock, alice);
  });

  it('name', async () => {
    const v = await hbt.name();
    assert.equal(v, 'Habitat Token');
  });

  it('symbol', async () => {
    const v = await hbt.symbol();
    assert.equal(v, 'HBT');
  });

  it('decimals', async () => {
    const v = await hbt.decimals();
    assert.equal(v, 10);
  });

  it('DOMAIN_SEPARATOR', async () => {
    const v = await hbt.DOMAIN_SEPARATOR();
    const hash = ethers.utils._TypedDataEncoder.hashDomain(
      {
        name: await hbt.name(),
        chainId: await alice.getChainId(),
        verifyingContract: hbt.address,
      }
    );
    assert.equal(v, hash);
  });

  it('check initial supply', async () => {
    assert.equal((await hbt.totalSupply()).toString(), (INITIAL_SUPPLY * 10 ** 10).toString());
    assert.equal(
      (await hbt.totalSupply()).toString(),
      (await hbt.balanceOf(alice.address)).toString(),
      'alice should own total supply'
    );
  });

  it('recoverLostTokens: own', async () => {
    await hbt.transfer(hbt.address, 123);
    assert.equal((await hbt.balanceOf(hbt.address)).toString(), '123');
    await hbt.connect(charlie).recoverLostTokens(hbt.address);
    assert.equal((await hbt.balanceOf(hbt.address)).toString(), '0');
    assert.equal((await hbt.balanceOf(charlie.address)).toString(), '123');
  });

  it('recoverLostTokens: other', async () => {
    await other.transfer(hbt.address, 123);
    assert.equal((await other.balanceOf(hbt.address)).toString(), '123');
    await hbt.connect(charlie).recoverLostTokens(other.address);
    assert.equal((await other.balanceOf(hbt.address)).toString(), '0');
    assert.equal((await other.balanceOf(charlie.address)).toString(), '123');
  });

  it('approve', async () => {
    const allowance = BigInt.asUintN(256, '-1');
    await hbt.approve(bob.address, allowance);

    assert.equal(allowance.toString(), (await hbt.allowance(alice.address, bob.address)).toString());
  });

  it('transfer to bob', async () => {
    const tx = await hbt.transfer(bob.address, TRANSFER_AMOUNT);
    assert.equal(TRANSFER_AMOUNT, (await hbt.balanceOf(bob.address)).toString());
  });

  it('transferFrom to bob - should fail', async () => {
    const tx = await hbt.transferFrom(alice.address, bob.address, TRANSFER_AMOUNT, { gasLimit: 10_000_000 });
    assert.rejects(tx.wait(), /transaction failed/)
  });

  it('permit', async () => {
    const permit = await signPermit(hbt, alice, alice.address, TRANSFER_AMOUNT);
    const tx = await hbt.permit(permit.owner, permit.spender, permit.value, permit.deadline, permit.v, permit.r, permit.s);
    const receipt = await tx.wait();
    console.log(receipt.gasUsed.toString());
  });

  it('transferFrom to bob', async () => {
    const oldBalance = await hbt.balanceOf(bob.address);
    await hbt.transferFrom(alice.address, bob.address, TRANSFER_AMOUNT);
    assert.equal(TRANSFER_AMOUNT, (await hbt.balanceOf(bob.address)).sub(oldBalance).toString());
  });

  it('transfer from alice to alice', async () => {
    const oldBalance = await hbt.balanceOf(alice.address);
    const tx = await hbt.transfer(alice.address, TRANSFER_AMOUNT);
    assert.ok(oldBalance.eq(await hbt.balanceOf(alice.address)), 'balance should be the same');
  });

  it('transferFrom with allowance - not approved', async () => {
    await assert.rejects(hbt.connect(charlie).transferFrom(alice.address, charlie.address, TRANSFER_AMOUNT), /ALLOWANCE/);
  });

  it('transfer should fail - zero value triggers overflow check', async () => {
    await assert.rejects(hbt.transfer(bob.address, 0), /OVERFLOW/);
  });

  it('approve charlie', async () => {
    await hbt.approve(charlie.address, TRANSFER_AMOUNT);

    assert.equal(TRANSFER_AMOUNT.toString(), (await hbt.allowance(alice.address, charlie.address)).toString());
  });

  it('transferFrom with allowance', async () => {
    const oldBalance = await hbt.balanceOf(charlie.address);
    const tx = await hbt.connect(charlie).transferFrom(alice.address, charlie.address, TRANSFER_AMOUNT);
    assert.equal(TRANSFER_AMOUNT, (await hbt.balanceOf(charlie.address)).sub(oldBalance).toString());
  });

  it('transferAndCall', async () => {
    const callData = callMock.interface.encodeFunctionData('someCall', [alice.address, alice.address]);
    const oldBalance = await hbt.balanceOf(alice.address);

    const tx = await hbt.transferAndCall(callMock.address, TRANSFER_AMOUNT, callData);
    const receipt = await tx.wait();
    const { data, topics } = receipt.events[2];
    const evt = callMock.interface.decodeEventLog('Evt', data, topics);

    assert.equal(evt.from, alice.address);
    assert.equal(evt.balance.toString(), TRANSFER_AMOUNT.toString());
    assert.equal(evt.allowance.toString(), '0');
    assert.ok(oldBalance.eq(await hbt.balanceOf(alice.address)), 'balance should be the same');
  });

  it('approveAndCall', async () => {
    const callData = callMock.interface.encodeFunctionData('someCall', [alice.address, charlie.address]);
    const oldBalance = await hbt.balanceOf(charlie.address);

    const tx = await hbt.approveAndCall(callMock.address, TRANSFER_AMOUNT, callData);
    const receipt = await tx.wait();
    const { data, topics } = receipt.events[2];
    const evt = callMock.interface.decodeEventLog('Evt', data, topics);

    assert.equal(evt.from, alice.address);
    assert.equal(evt.balance.toString(), '0');
    assert.equal(evt.allowance.toString(), TRANSFER_AMOUNT.toString());
    assert.equal((await hbt.balanceOf(charlie.address)).toString(), oldBalance.add(TRANSFER_AMOUNT).toString());
    assert.equal((await hbt.allowance(alice.address, callMock.address)), '0');
  });

  it('redeemPermitAndCall', async () => {
    const callData = callMock.interface.encodeFunctionData('someCall', [alice.address, charlie.address]);
    const { permitData } = await signPermit(hbt, alice, callMock.address, TRANSFER_AMOUNT);
    const oldBalance = await hbt.balanceOf(charlie.address);

    const tx = await hbt.redeemPermitAndCall(callMock.address, permitData, callData);
    const receipt = await tx.wait();
    const { data, topics } = receipt.events[2];
    const evt = callMock.interface.decodeEventLog('Evt', data, topics);

    assert.equal(evt.from, alice.address);
    assert.equal(evt.balance.toString(), '0');
    assert.equal(evt.allowance.toString(), TRANSFER_AMOUNT.toString());
    assert.equal((await hbt.balanceOf(charlie.address)).toString(), oldBalance.add(TRANSFER_AMOUNT).toString());
    assert.equal((await hbt.allowance(alice.address, callMock.address)), '0');
  });
});
