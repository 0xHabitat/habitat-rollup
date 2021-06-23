import { wrapListener, checkScroll } from '/lib/utils.js';
import { getProviders } from '/lib/rollup.js';
import { renderTransaction, ZERO_HASH, explorerSearch } from './common.js';

let provider;

class BlockExplorer {
  constructor (pending, proposed) {
    this.high = 0;
    this.low = 0;
    this.pendingContainer = pending;
    this.proposedContainer = proposed;

    checkScroll(
      '.content',
      async () => {
        if (this.low > 1) {
          const block = await provider.getBlock(this.low - 1);
          this.low = block.number;
          this.renderBlock(block);
          return this.low > 1;
        }
      }
    );
  }

  renderBlock (block) {
    const START = 4;
    const ts = (new Date(block.timestamp * 1000)).toLocaleString();
    const args = [Number(block.number), ts, block.transactions.length, block.hash.substring(0, 32) + '...'];
    const isPending = block.hash === ZERO_HASH;
    const container = isPending ? this.pendingContainer : this.proposedContainer;
    const append = block.number === this.low;

    for (let i = 0, len = args.length; i < len; i++) {
      const arg = args[i];
      const child = document.createElement('a');
      child.href = `block/#${block.hash}`;
      child.textContent = arg;

      if (isPending) {
        container.children[START + i].replaceWith(child);
        continue;
      }

      if (append) {
        container.appendChild(child);
      } else {
        container.insertBefore(child, container.children[START + i]);
      }
    }
  }

  async poll () {
    const latestBlock = await provider.getBlock();
    if (latestBlock.number > this.high || latestBlock.hash === ZERO_HASH) {
      this.renderBlock(latestBlock);
      const delta = latestBlock.number - this.high;
      this.high = latestBlock.number;

      if (this.low !== 0 && delta > 0) {
        console.log(this.low,this.high);
        for (let i = this.high - delta; i < this.high; i++) {
          const block = await provider.getBlock(i);
          this.renderBlock(block);
        }
      }
    }
    if (this.low === 0) {
      this.low = this.high;
    }
  }
}

async function render () {
  const { rootProvider, childProvider, bridge } = await getProviders();
  provider = childProvider;

  wrapListener('#search', explorerSearch, 'keyup');
  const explorer = new BlockExplorer(document.querySelector('#pending'), document.querySelector('#proposed'));

  async function update () {
    try {
      await explorer.poll();
    } catch (e) {
      console.warn(e);
    }
    setTimeout(update, 3000);
  }
  await update();

  const finalizedHeight = await bridge.finalizedHeight();
  document.querySelector('#status').textContent =
    `Bridge: ${bridge.address}\nFinalized Height: ${finalizedHeight}\nL1: ${rootProvider.connection.url}\nL2: ${childProvider.connection.url}`;
}

window.addEventListener('DOMContentLoaded', render, false);
