import ethers from 'ethers';
import { signPermit } from './helpers.js';

describe('DropletWrapper', function () {
  const { DropletWrapperMock, DropletMock, HabitatToken } = Artifacts;
  const { alice, bob, charlie } = getDefaultWallets();
  const ACTIVATION_DELAY = 3;
  let hbt;
  let dropletWrapper;
  let dropletMock;

  before('Prepare contracts', async () => {
    hbt = await deploy(HabitatToken, alice);
    dropletMock = await deploy(DropletMock, alice, hbt.address);
    dropletWrapper = await deploy(DropletWrapperMock, alice, ACTIVATION_DELAY, hbt.address, charlie.address, dropletMock.address);
  });

  it('DropletMock: set payee', async () => {
    const tx = await dropletMock.setPayee(dropletWrapper.address);
    const receipt = await tx.wait();
  });

  it('transfer to DropletMock', async () => {
    await (await hbt.transfer(dropletMock.address, '0xffffffffff')).wait();
  });

  it('execute: should fail without rollupBridge', async () => {
    const data = '0x';
    await assert.rejects(dropletWrapper.execute(data));
  });

  it('setReserve: should fail if sender != owner', async () => {
    await assert.rejects(dropletWrapper.setReserve(charlie.address));
  });

  it('setReserve', async () => {
    await (await dropletWrapper.connect(charlie).setReserve(charlie.address)).wait();
  });

  it('setReserve: should fail', async () => {
    await assert.rejects(dropletWrapper.connect(charlie).setReserve(charlie.address), /EARLY/);
  });

  it('setReserve: to another address', async () => {
    await (await dropletWrapper.connect(charlie).setReserve(bob.address)).wait();

    const pending = await dropletWrapper.pendingChange();
    assert.equal(pending.reserve, bob.address);
  });

  it('setReserve: to charlie', async () => {
    await (await dropletWrapper.connect(charlie).setReserve(charlie.address)).wait();

    const pending = await dropletWrapper.pendingChange();
    assert.equal(pending.reserve, charlie.address);
  });

  it('sleep', async () => {
    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_DELAY * 1200));
    // mine a block
    await (await alice.sendTransaction({to: alice.address })).wait();
  });

  it('setReserve - activation', async () => {
    await (await dropletWrapper.connect(charlie).setReserve(charlie.address)).wait();
  });

  it('setReserve: can\'t be set a second time', async () => {
    await assert.rejects(dropletWrapper.connect(charlie).setReserve(charlie.address));
  });

  it('execute: should work', async () => {
    const data = '0x';
    const tx = await dropletWrapper.execute(data);
    const receipt = await tx.wait();
    assert.equal(receipt.events.length, 2, 'approve, transfer');
    assert.equal((await hbt.balanceOf(dropletWrapper.address)).toString(), '1000');
  });
});
