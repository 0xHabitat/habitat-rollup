import TransactionBuilder from '../common/TransactionBuilder.js';
import { TYPED_DATA } from '../common/constants.js';
import { ipfsPush } from '../common/ipfs.js';
import FRONTEND_FILES from '../files.js';
import habitatBytecode from './bytecode.js';

const ABI = [
  'function nonces(address) view returns (uint256)',
];

const ctx = Object.create(null);
const txBuilder = new TransactionBuilder(TYPED_DATA);

async function sendInitHabitatTransaction (message) {
  const primaryType = 'InitMoloch';
  const signer = ctx.signer;
  const signerAddress = await signer.getAddress();

  message.nonce = 0;

  const tx = Object.assign({ message, primaryType }, TYPED_DATA);
  const sig = await signer.provider.send('eth_signTypedData_v3', [signerAddress, JSON.stringify(tx)]);
  const { r, s, v } = ethers.utils.splitSignature(sig);
  const encoded = txBuilder.encode(Object.assign(tx, { r, s, v }));

  let rawTx = '';
  for (const v of encoded) {
    rawTx += v.toString(16).padStart(2, '0');
  }
  log({ rawTx });

  // send as a block to L1
  const FUNC_SIG_SUBMIT_BLOCK = '0x25ceb4b2';
  const layer1Tx = await signer.sendTransaction(
    {
      to: document.querySelector('input#BRIDGE_ADDRESS').value,
      data: FUNC_SIG_SUBMIT_BLOCK + rawTx,
    }
  );
  log({ layer1Tx });

  const receipt = await layer1Tx.wait();
  return receipt;
}

async function connectWallet () {
  await window.ethereum.enable();

  ctx.rootProvider = new ethers.providers.Web3Provider(window.ethereum);
  ctx.signer = await ctx.rootProvider.getSigner();

  log({ signer: await ctx.signer.getAddress() });
}

async function deployHabitat () {
  const _factory = new ethers.ContractFactory(
    [],
    habitatBytecode,
    ctx.signer
  );
  const contract = await _factory.deploy();

  log(contract.deployTransaction);
  await contract.deployTransaction.wait();
}

async function initHabitat () {
  const args = {
    summoner: await ctx.signer.getAddress(),
    summoningTime: ~~(Date.now() / 1000),
  };

  const elements = document.querySelectorAll('#config input');
  for (const element of elements) {
    const key = element.id;
    const val = element.value;

    if (!val) {
      throw new Error(`${key}`);
    }
    args[key] = val;
  }
  log(args);

  const receipt = await sendInitHabitatTransaction(args);
  log(receipt);
}

function createNodeConfig () {
  const elements = document.querySelectorAll('#nodeConfig input');
  const config = {
    PORT: '8080',
    HOST: '0.0.0.0',
    TYPED_DATA: `'${JSON.stringify(TYPED_DATA)}'`,
  };
  let flyctlCommand = 'flyctl secrets set ';
  let dockerCommand = 'docker create --name habitat --restart=unless-stopped -p 8080:8080 ';

  for (const element of elements) {
    const key = element.id;
    const value = element.value;

    config[key] = value;
  }

  for (const key in config) {
    const value = config[key];
    flyctlCommand += `${key}=${value} `;
    dockerCommand += `-e ${key}=${value} `;
  }
  dockerCommand += 'ghcr.io/nutberry/artifacts/habitat:latest';

  document.querySelector('#flyctlConfig').textContent = flyctlCommand;
  document.querySelector('#dockerConfig').textContent = dockerCommand;
}

async function createFrontendConfig () {
  const network = await ctx.rootProvider.getNetwork();
  const config = {
    RPC_URL: document.querySelector('input#RPC_URL').value,
    ROOT_CHAIN_ID: network.chainId,
  };
  let configStr = '';

  for (const key in config) {
    const value = JSON.stringify(config[key]);

    configStr += `export const ${key} = ${value};\n`;
  }

  log(configStr);

  const url = `https://ipfs.infura.io:5001/api/v0/add?pin=true&cid-version=1&hash=sha2-256`;
  const files = {
    '_/config.js': (new TextEncoder()).encode(configStr),
  };

  for (const filePath of FRONTEND_FILES) {
    if (filePath === '/config.js') {
      continue;
    }

    const response = await fetch(filePath);
    const bytes = new Uint8Array(await response.arrayBuffer());

    files[filePath.replace('/', '_/')] = bytes;
  }

  const deployRes = await ipfsPush(url, files);

  for (const obj of deployRes) {
    if (obj.Name === '_') {
      const url = `https://${obj.Hash}.ipfs.infura-ipfs.io/`;
      log(url);
      break;
    }
  }
}

let lastEvent;
async function wrap (evt) {
  lastEvent = evt;
  evt.target.disabled = true;

  try {
    await this(evt);
  } catch (e) {
    log({ error: e.toString() });
  }

  evt.target.disabled = false;
}

// start
const container = document.querySelector('.container');

container.querySelector('#connectWallet').onclick = wrap.bind(connectWallet);
container.querySelector('#deployHabitat').onclick = wrap.bind(deployHabitat);
container.querySelector('#initHabitat').onclick = wrap.bind(initHabitat);
container.querySelector('#createNodeConfig').onclick = wrap.bind(createNodeConfig);
container.querySelector('#createFrontendConfig').onclick = wrap.bind(createFrontendConfig);

async function log (...args) {
  if (!lastEvent) {
    return;
  }

  let pre = lastEvent.target.parentElement.querySelector('pre#log');

  if (!pre) {
    pre = document.createElement('pre');
    pre.id = 'log';
    lastEvent.target.parentElement.appendChild(pre);
  }

  pre.innerText = JSON.stringify(...args, null, 2);
  if (pre.scrollIntoViewIfNeeded) {
    pre.scrollIntoViewIfNeeded();
  }
}
