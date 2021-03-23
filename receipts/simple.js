import ethers from 'ethers';
import fs from 'fs';

import TransactionBuilder from '@NutBerry/rollup-bricks/dist/TransactionBuilder.js';
import { Bridge, startServer } from '@NutBerry/rollup-bricks/dist/bricked.js';

import TYPED_DATA from './../src/rollup/habitatV1.js';
import { encodeProposalActions } from './../src/rollup/test/utils.js';

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
  const HabitatV1Mock = JSON.parse(fs.readFileSync('./build/contracts/HabitatV1Mock.json'));
  const ExecutionProxy = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json'));
  const ERC20 = JSON.parse(fs.readFileSync('./build/contracts/TestERC20.json'));
  //
  const rootRpcUrl = process.env.ROOT_RPC_URL;
  const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8111');
  const wallet = new ethers.Wallet(privKey, rootProvider);
  //
  const bridgeL1 = await deploy(HabitatV1Mock, [], wallet);
  const execProxy = await deploy(ExecutionProxy, [bridgeL1.address], wallet);
  const erc20 = await deploy(ERC20, [], wallet);

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
    const path = './web/lib/.rollup-config.js';
    const config = fs.readFileSync(path).toString().split('\n').filter((e) => e.indexOf('EXECUTION_PROXY_ADDRESS') === -1);
    config.push(`export const EXECUTION_PROXY_ADDRESS = '${execProxy.address}';`);
    console.log(config);
    fs.writeFileSync('./web/lib/rollup-config.js', config.join('\n'));

    // try to forward the chain at a interval
    setInterval(async () => {
      await br.forwardChain();
      // forward
      await br.directReplay(BigInt((await bridgeL1.finalizedHeight()).add(1)));
    }, 3000);
  }
  //
  const bridgeL2 = bridgeL1.connect(provider);

  {
    for (let i = 0; i < 32; i++) {
      let args = {
        governanceToken: erc20.address,
        metadata: JSON.stringify({ title: `Community #${i}` }),
      };
      let tmp = await sendTransaction('CreateCommunity', args, wallet, bridgeL2);

      args = {
        communityId: tmp.events[0].args.communityId,
        condition: ethers.constants.AddressZero,
        metadata: JSON.stringify({ title: `Test Vault` }),
      };
      tmp = await sendTransaction('CreateVault', args, wallet, bridgeL2);

      args = {
        startDate: ~~(Date.now() / 1000) + i,
        vault: tmp.events[0].args.vaultAddress,
        title: 'Foo the Bar',
        actions: '0x',
      };
      tmp = await sendTransaction('CreateProposal', args, wallet, bridgeL2);
    }
  }

  {
    // deposit
    const amount = '0xffffffff';
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
