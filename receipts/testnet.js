import ethers from 'ethers';
import fs from 'fs';
import assert from 'assert';
import { Bridge, startServer } from '@NutBerry/NutBerry/dist/node.js';
import { encodeInternalProposalActions, encodeExternalProposalActions } from './../src/rollup/test/utils.js';
import { toMeta, deploy, sendTransaction, wallet, layer1, layer2, erc20 } from './utils.js';

const COMMUNITIES = [
  { title: 'Habitat', token: '0x1170fc4d4a1b8e4d5498be7429a9ec3920f8f114', bannerCid: 'bafkreifbkamle553sombbxlvfrtf4zmargw6quybuzq74pabfxwig6qawe' },
  { title: 'Other', token: '' },
];
const LOREM_IPSUM = `
Earum commodi voluptas mollitia recusandae odit labore dolorem voluptatem. Molestiae quo consequuntur quia veniam et. Aspernatur veritatis est porro iure numquam voluptas deleniti aut. Est sit cupiditate quia. Eius aut architecto consectetur in a. Consequuntur consectetur expedita dolor.

Eos quod magni quia enim architecto repellat accusantium laudantium. Nemo praesentium nihil explicabo mollitia voluptatum numquam quasi. Saepe ipsum asperiores iste possimus minus fuga sint repellendus. Aut provident quis ut.


Alias laboriosam in ut dolorem quaerat placeat rerum. Quam quo molestiae exercitationem et. Ab iure numquam officia aspernatur hic harum enim. Ducimus beatae dolor sed.
Sit ex necessitatibus ullam tempore sit est quo. Voluptatum omnis ipsum est perferendis eligendi in accusamus beatae. Eum eveniet magni ut necessitatibus qui velit. Repellendus ea repellendus qui. Voluptas et amet dolore dolor doloribus.

Sed quibusdam illo non dicta vitae blanditiis omnis est. Nesciunt a voluptas rerum maiores eaque ab. Accusamus fuga est ea quis hic quia corrupti. Vero molestias quasi qui architecto doloribus eos. Odit dolores nam officia alias voluptatem. Praesentium deserunt et facere voluptatum porro neque ea quo.
`;

async function main () {
  if ((await layer2.provider.getBlockNumber()) > 1) {
    return;
  }

  {
    // claim username
    await sendTransaction('ClaimUsername', { shortString: '0x53616272696e612074686520f09f9980' }, wallet, layer2);
  }

  // register modules
  const { MODULES } = await import('./modules.js');

  {
    COMMUNITIES[COMMUNITIES.length - 1].token = erc20.address;
    for (const obj of COMMUNITIES) {
      let args = {
        governanceToken: obj.token,
        metadata: toMeta(obj),
      };
      let tmp = await sendTransaction('CreateCommunity', args, wallet, layer2);
      const communityId = tmp.events[0].args.communityId;

      for (const module of MODULES) {
        args = {
          communityId,
          condition: module.contractAddress,
          metadata: toMeta({ title: `Treasure Chest` }),
        };
        tmp = await sendTransaction('CreateVault', args, wallet, layer2);

        args = {
          startDate: ~~(Date.now() / 1000),
          vault: tmp.events[0].args.vaultAddress,
          internalActions: encodeInternalProposalActions(['0x01', obj.token, wallet.address, '0xfffffffffffff']),
          externalActions: encodeExternalProposalActions(['0x0aCe32f6E87Ac1457A5385f8eb0208F37263B415', '0xc0ffebabe17da53158']),
          metadata: toMeta({ title: 'Re: Evolution 🌱', details: LOREM_IPSUM }),
        };
        tmp = await sendTransaction('CreateProposal', args, wallet, layer2);
      }
    }
  }

  {
    // deposit
    const amount = '0x' + (100_000_000n * (10n ** 10n)).toString(16);
    const oldBlock = await layer2.provider.getBlockNumber();
    let tx = await erc20.approve(layer1.address, amount);
    let receipt = await tx.wait();

    tx = await layer1.deposit(erc20.address, amount, wallet.address);
    receipt = await tx.wait();

    // wait for deposit block to arrive
    let nBlock = await layer2.provider.getBlockNumber();
    while (oldBlock === nBlock) {
      nBlock = await layer2.provider.getBlockNumber();
    }
  }
}

main();
