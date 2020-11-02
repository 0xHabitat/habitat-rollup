import { ROOT_CHAIN_ID, RPC_URL, EXECUTION_PROXY_ADDRESS } from '../config.js';
import { BRICK_ABI, EXECUTION_PROXY_ABI, TYPED_DATA } from './constants.js';

export async function getProviders () {
  if (document._providers) {
    return document._providers;
  }

  const rootProvider = ROOT_CHAIN_ID === 99 ? new ethers.providers.JsonRpcProvider('http://localhost:8222') : new ethers.getDefaultProvider(ROOT_CHAIN_ID);
  const childProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const bridgeAddress = await childProvider.send('web3_clientVersion', []);
  const habitat = new ethers.Contract(bridgeAddress, BRICK_ABI, childProvider);
  const bridgeContract = habitat.connect(rootProvider);

  document._providers = { rootProvider, childProvider, habitat, bridgeContract };

  return document._providers;
}

export async function getSigner () {
  if (document._signer) {
    return document._signer;
  }

  if (!window.ethereum) {
    throw new Error('Please visit this page with a dApp compatible browser');
  }

  // TODO: check for errors
  await window.ethereum.enable();
  const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  const network = await signer.provider.getNetwork();

  if (network.chainId !== ROOT_CHAIN_ID) {
    throw new Error(`Please switch your wallet network to ${ethers.utils.getNetwork(ROOT_CHAIN_ID).name}`);
  }

  document._signer = signer;

  return signer;
}

export async function sendTransaction (primaryType, message) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.nonces(signerAddress)).toHexString();
  }

  const callResult = await habitat.provider.send('eth_call', [{ from: signerAddress, primaryType, message }]);
  const errorSig = '0x08c379a0';

  if (callResult.startsWith(errorSig)) {
    const errMsg = ethers.utils.defaultAbiCoder.decode(['string'], callResult.replace(errorSig, '0x'));
    throw new Error(`calling contract: ${errMsg}`);
  }
  console.log({ callResult });

  const tx = Object.assign({ message, primaryType }, TYPED_DATA);
  const sig = await signer.provider.send('eth_signTypedData_v3', [signerAddress, JSON.stringify(tx)]);
  const { r, s, v } = ethers.utils.splitSignature(sig);

  const txHash = await habitat.provider.send('eth_sendRawTransaction', [{ primaryType, message, r, s, v }]);
  const receipt = await habitat.provider.getTransactionReceipt(txHash);
  console.log({ receipt });

  for (const obj of receipt.logs) {
    console.log({ evt: habitat.interface.parseLog(obj) });
  }

  return receipt;
}

export async function executeProposalActions (proposalIndex, actions) {
  const signer = await getSigner();
  const execProxy = new ethers.Contract(EXECUTION_PROXY_ADDRESS, EXECUTION_PROXY_ABI, signer);

  console.log({ proposalIndex, actions });
  return execProxy.execute(proposalIndex, actions);
}

export function encodeProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const addr = ary[i++].replace('0x', '').padStart(64, '0');
    const data = ary[i++].replace('0x', '');
    const dataSize = (data.length / 2).toString(16).padStart(64, '0')

    res += addr + dataSize + data;
  }

  return res;
}

export function decodeProposalActions (hexString) {
  const res = [];

  for (let i = hexString[1] === 'x' ? 2 : 0, len = hexString.length; i < len;) {
    // 32 bytes address
    const addr = hexString.substring(i += 24, i += 40).padStart(40, '0');
    res.push('0x' + addr);

    // 32 bytes calldata size
    const dataSize = parseInt(hexString.substring(i, i += 64), 16);
    console.log({i,dataSize});

    if (dataSize) {
      // calldata
      const data = hexString.substring(i, i += (dataSize * 2));
      res.push('0x' + data);
    } else {
      res.push('0x');
    }
  }

  console.log(res);
  return res;
}
