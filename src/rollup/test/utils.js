import ethers from 'ethers';
import TYPED_DATA from '../habitatV1.js';

export function encodeExternalProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const addr = ary[i++].replace('0x', '').padStart(64, '0');
    const data = ary[i++].replace('0x', '');
    const dataSize = (data.length / 2).toString(16).padStart(64, '0')

    res += addr + dataSize + data;
  }

  return res;
}

export function encodeInternalProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const type = ary[i++].replace('0x', '').padStart(2, '0');
    if (type !== '01') {
      throw new Error(`unsupported type ${type}`);
    }
    const token = ary[i++].replace('0x', '').padStart(40, '0');
    const receiver = ary[i++].replace('0x', '').padStart(40, '0');
    const value = ary[i++].replace('0x', '').padStart(64, '0');

    res += type + token + receiver + value;
  }

  return res;
}

export async function createTransaction (primaryType, _message, signer, habitat) {
  const message = {};
  for (const k in _message) {
    let v = _message[k];
    if (typeof v === 'bigint') {
      v = v.toString();
    }
    message[k] = v;
  }

  if (message.nonce === undefined && TYPED_DATA.types[primaryType][0].name === 'nonce') {
    message.nonce = (await habitat.callStatic.txNonces(signer.address)).toHexString();
  }

  const tx = {
    primaryType,
    message,
  };
  const sig = await signer._signTypedData(
    TYPED_DATA.domain,
    { [primaryType]: TYPED_DATA.types[primaryType] },
    tx.message,
  );
  const { v, r, s } = ethers.utils.splitSignature(sig);

  Object.assign(tx, { r, s, v });

  const txHash = await habitat.provider.send('eth_sendRawTransaction', [tx]);
  const receipt = await habitat.provider.send('eth_getTransactionReceipt', [txHash]);

  receipt.events = [];
  receipt.logs.forEach((log) => {
    try {
      receipt.events.push(habitat.interface.parseLog(log));
    } catch (e) {}
  });

  return { txHash, receipt };
}

async function _findDomain (token, wallet) {
  let domainSeparator;
  try {
    domainSeparator = await token.DOMAIN_SEPARATOR();
  } catch (e) {
    console.log(e);
    return;
  }

  let version = '1';
  try {
    version = await token.version();
  } catch (e) {
  }

  const verifyingContract = token.address;
  const chainId = await wallet.getChainId();
  const name = await token.name();
  const tmp = { name, version, chainId, verifyingContract };
  const patterns = [
    ['name', 'version', 'chainId', 'verifyingContract'],
    ['name', 'chainId', 'verifyingContract'],
    ['name', 'chainId'],
    ['name', 'verifyingContract'],
    ['name'],
    ['name', 'version'],
  ];
  let domain;
  for (const pattern of patterns) {
    domain = {};
    for (const x of pattern) {
      domain[x] = tmp[x];
      const hash = ethers.utils._TypedDataEncoder.hashDomain(domain);
      if (hash === domainSeparator) {
        return domain;
      }
    }
  }

  throw new Error('can\'t determine DOMAIN_SEPARATOR');
}

export async function _signPermit (token, wallet, domain, spender, value) {
  const PERMIT_STRUCT = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
  ];

  const PERMIT_EIP_2612 = new ethers.utils.Interface(
    ['function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)']
  );

  const owner = await wallet.getAddress();
  const deadline = ~~(Date.now() / 1000) + 3600;
  const nonce = await token.nonces(owner);
  const args = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  };
  const sig = await wallet._signTypedData(
    domain,
    { Permit: PERMIT_STRUCT },
    args
  );
  const { v, r, s } = ethers.utils.splitSignature(sig);
  const permitData =
    PERMIT_EIP_2612.encodeFunctionData('permit', [args.owner, args.spender, args.value, args.deadline, v, r, s]);

  return Object.assign(args, { v, r, s, domain, permitData });
}

const FAKE_WALLET = new ethers.Wallet('0x88426e5c8987b3ec0b7cb58bfedc420f229a548d1e6c9d7d0ad0066c3f69e87f');

export async function signPermit (token, wallet, spender, value) {
  let domain;
  try {
    domain = await _findDomain(token, wallet);
  } catch (e) {
    console.log(e);
    return;
  }

  const permit = await _signPermit(token, FAKE_WALLET, domain, spender, value);
  const ret = await wallet.provider.send('eth_call', [{ to: token.address, data: permit.permitData }, 'latest']);

  if (ret === '0x') {
    return _signPermit(token, wallet, domain, spender, value);
  }
}
