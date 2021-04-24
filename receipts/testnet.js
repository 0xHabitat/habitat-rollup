import ethers from 'ethers';
import fs from 'fs';
import assert from 'assert';

import TransactionBuilder from '@NutBerry/rollup-bricks/dist/TransactionBuilder.js';
import { Bridge, startServer } from '@NutBerry/rollup-bricks/dist/bricked.js';
import TYPED_DATA from './../src/rollup/habitatV1.js';
import { encodeInternalProposalActions, encodeExternalProposalActions } from './../src/rollup/test/utils.js';
import { getDeployCode } from './../src/rollup/lib/utils.js';

const COMMUNITIES = [
  //{ title: 'LeapDAO', token: '0x78230e69d6e6449db1e11904e0bd81c018454d7a' },
  //{ title: 'Strudel Finance', token: '0x297d33e17e61c2ddd812389c2105193f8348188a' },
  { title: 'Habitat', token: '0x1170fc4d4a1b8e4d5498be7429a9ec3920f8f114' },
];
const LOREM_IPSUM = `
Earum commodi voluptas mollitia recusandae odit labore dolorem voluptatem. Molestiae quo consequuntur quia veniam et. Aspernatur veritatis est porro iure numquam voluptas deleniti aut. Est sit cupiditate quia. Eius aut architecto consectetur in a. Consequuntur consectetur expedita dolor.

Eos quod magni quia enim architecto repellat accusantium laudantium. Nemo praesentium nihil explicabo mollitia voluptatum numquam quasi. Saepe ipsum asperiores iste possimus minus fuga sint repellendus. Aut provident quis ut.


Alias laboriosam in ut dolorem quaerat placeat rerum. Quam quo molestiae exercitationem et. Ab iure numquam officia aspernatur hic harum enim. Ducimus beatae dolor sed.
Sit ex necessitatibus ullam tempore sit est quo. Voluptatum omnis ipsum est perferendis eligendi in accusamus beatae. Eum eveniet magni ut necessitatibus qui velit. Repellendus ea repellendus qui. Voluptas et amet dolore dolor doloribus.

Sed quibusdam illo non dicta vitae blanditiis omnis est. Nesciunt a voluptas rerum maiores eaque ab. Accusamus fuga est ea quis hic quia corrupti. Vero molestias quasi qui architecto doloribus eos. Odit dolores nam officia alias voluptatem. Praesentium deserunt et facere voluptatum porro neque ea quo.
`;
const builder = new TransactionBuilder(TYPED_DATA);

async function sendTransaction (primaryType, message, signer, bridge) {
  if (message.nonce === undefined && builder.fieldNames[primaryType][0].name === 'nonce') {
    message.nonce = (await bridge.txNonces(signer.address)).toHexString();
  }

  const tx = {
    primaryType,
    message,
  };
  const hash = builder.sigHash(tx);
  const { r, s, v } = signer._signingKey().signDigest(hash);

  Object.assign(tx, { r, s, v });

  const txHash = await bridge.provider.send('eth_sendRawTransaction', [tx]);
  const receipt = await bridge.provider.send('eth_getTransactionReceipt', [txHash]);
  const events = [];
  for (const log of receipt.logs) {
    try {
      const evt = bridge.interface.parseLog(log);
      events.push(evt);
    } catch (e) {
    }
  }

  return { txHash, receipt, events };
}

async function deploy (artifact, args, wallet, txOverrides = {}) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  let contract = await _factory.deploy(...args, txOverrides);
  let tx = await contract.deployTransaction.wait();

  return contract;
}

async function main () {
  const privKey = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200';
  //
  const HabitatV1Testnet = JSON.parse(fs.readFileSync('./build/contracts/HabitatV1Testnet.json'));
  const ExecutionProxy = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json'));
  const ERC20 = JSON.parse(fs.readFileSync('./build/contracts/TestERC20.json'));
  const OneShareOneVote = JSON.parse(fs.readFileSync('./build/contracts/OneShareOneVote.json'));
  const RollupProxy = JSON.parse(fs.readFileSync('./build/contracts/RollupProxy.json'));
  //
  const rootRpcUrl = process.env.ROOT_RPC_URL;
  const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
  const wallet = new ethers.Wallet(privKey, rootProvider);
  //
  let initd = false;
  let bridgeL1, execProxy, erc20, oneShareOneVote;
  const configPath = process.argv[2];
  console.log(configPath);
  if (configPath && fs.existsSync(configPath)) {
    initd = true;
    const config = JSON.parse(fs.readFileSync(configPath));
    bridgeL1 = new ethers.Contract(config.bridgeL1, HabitatV1Testnet.abi, wallet);
    execProxy = new ethers.Contract(config.execProxy, ExecutionProxy.abi, wallet);
    erc20 = new ethers.Contract(config.erc20, ERC20.abi, wallet);
    oneShareOneVote = new ethers.Contract(config.oneShareOneVote, OneShareOneVote.abi, wallet);
  } else {
    const implementation = await deploy(HabitatV1Testnet, [], wallet);
    const proxy = await deploy(RollupProxy, [implementation.address], wallet);
    bridgeL1 = new ethers.Contract(proxy.address, HabitatV1Testnet.abi, wallet);
    execProxy = await deploy(ExecutionProxy, [bridgeL1.address], wallet);
    erc20 = await deploy(ERC20, [], wallet);
    oneShareOneVote = await deploy({ bytecode: getDeployCode(OneShareOneVote.deployedBytecode), abi: [] }, [], wallet);
    const config = {
      bridgeL1: bridgeL1.address,
      execProxy: execProxy.address,
      erc20: erc20.address,
      oneShareOneVote: oneShareOneVote.address,
    }
    fs.writeFileSync(configPath, JSON.stringify(config));
  }

  console.log({ bridge: bridgeL1.address, executionProxy: execProxy.address, erc20: erc20.address, privKey });

  {
    const br = new Bridge(
      {
        debugMode: true,
        privKey,
        rootRpcUrl,
        contract: bridgeL1.address,
        typedData: TYPED_DATA
      }
    );
    await startServer(br, { host: '0.0.0.0', rpcPort: 8111 });
    await br.init();
    // edit the config file
    //const path = './web/lib/.rollup-config.js';
    //const config = fs.readFileSync(path).toString().split('\n').filter((e) => e.indexOf('EXECUTION_PROXY_ADDRESS') === -1);
    //config.push(`export const EXECUTION_PROXY_ADDRESS = '${execProxy.address}';`);
    //console.log(config);
    //fs.writeFileSync('./web/lib/rollup-config.js', config.join('\n'));

    // try to forward the chain at a interval
    setInterval(async () => {
      await br.forwardChain();
      // forward
      //await br.directReplay(BigInt((await bridgeL1.finalizedHeight()).add(1)));
    }, 3000);
  }
  //
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8111');
  const bridgeL2 = bridgeL1.connect(provider);
  if (initd) {
    return;
  }

  {
    // claim username
    await sendTransaction('ClaimUsername', { shortString: '0x53616272696e612074686520f09f9980' }, wallet, bridgeL2);
  }

  {
    // register modules
    for (const [name, addr] of [['One Share One Vote', oneShareOneVote.address]]) {
      const args = {
        contractAddress: addr,
        metadata: JSON.stringify({ name }),
      };
      const { txHash, receipt } = await sendTransaction('SubmitModule', args, wallet, bridgeL2);
      assert.equal(receipt.status, '0x1');
    }
  }

  {
    for (const obj of COMMUNITIES) {
      let args = {
        governanceToken: obj.token,
        metadata: JSON.stringify({ title: obj.title }),
      };
      let tmp = await sendTransaction('CreateCommunity', args, wallet, bridgeL2);
      const communityId = tmp.events[0].args.communityId;

      args = {
        communityId,
        condition: oneShareOneVote.address,
      };
      tmp = await sendTransaction('ActivateModule', args, wallet, bridgeL2);

      args = {
        communityId,
        condition: oneShareOneVote.address,
        metadata: JSON.stringify({ title: `Treasure Chest` }),
      };
      tmp = await sendTransaction('CreateVault', args, wallet, bridgeL2);

      args = {
        startDate: ~~(Date.now() / 1000),
        vault: tmp.events[0].args.vaultAddress,
        internalActions: encodeInternalProposalActions(['0x01', obj.token, wallet.address, '0xfffffffffffff']),
        externalActions: encodeExternalProposalActions(['0x0aCe32f6E87Ac1457A5385f8eb0208F37263B415', '0xc0ffebabe17da53158']),
        metadata: JSON.stringify({ title: 'Re: Evolution 🌱', details: LOREM_IPSUM }),
      };
      tmp = await sendTransaction('CreateProposal', args, wallet, bridgeL2);
    }
  }

  {
    // deposit
    const amount = '0xffffffffffffffffff';
    const oldBlock = await provider.getBlockNumber();
    let tx = await erc20.approve(bridgeL1.address, amount);
    let receipt = await tx.wait();

    tx = await bridgeL1.deposit(erc20.address, amount, wallet.address);
    receipt = await tx.wait();

    // wait for deposit block to arrive
    let nBlock = await provider.getBlockNumber();
    while (oldBlock === nBlock) {
      nBlock = await provider.getBlockNumber();
    }
  }
}

main();
