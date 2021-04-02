import CONFIGS from './config.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

export { ethers };

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function version() view returns (string)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function nonces(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender,uint256 value) returns (bool)',
  'function transfer(address,uint256) returns (bool)',
];

const PERMIT_STRUCT = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];

const PERMIT_STRUCT_DAI = [
  { name: 'holder', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
];

const FAKE_WALLET = ethers.Wallet.createRandom();
const PERMIT_DAI = new ethers.utils.Interface(
  ['function permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed,uint8 v,bytes32 r,bytes32 s)']
);
const PERMIT_EIP_2612 = new ethers.utils.Interface(
  ['function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)']
);

let ROOT_CHAIN_ID = window.location.pathname.indexOf('testnet') === -1 ? 1 : 3;
const _cache = {};
let _prov;

export function getNetwork () {
  return ROOT_CHAIN_ID;
}

export function setNetwork (id) {
}

export function getProvider () {
  if (!_prov) {
    const name = getNetworkName(ROOT_CHAIN_ID);
    const url = `https://${name}.infura.io/v3/7d0d81d0919f4f05b9ab6634be01ee73`;
    _prov = new ethers.providers.JsonRpcProvider(url, 'any');
    // workaround that ethers.js requests eth_chainId for almost any call.
    const network = ethers.providers.getNetwork(ROOT_CHAIN_ID);
    _prov.detectNetwork = async () => network;
  }

  return _prov;
}

export function getNetworkName (id) {
  const networkName = ethers.providers.getNetwork(id).name;
  return networkName === 'homestead' ? 'mainnet' : networkName;
}

export async function getErc20 (addr) {
  if (!_cache[addr]) {
    const tkn = new ethers.Contract(addr, ERC20_ABI, getProvider());
    tkn._decimals = 18;
    try {
      tkn._decimals = await tkn.decimals();
    } catch (e) {
      console.error(e);
    }
    _cache[addr] = tkn;
  }

  return _cache[addr];
}

const WALLET_AUTH_KEY = '_utils_wallet_auth';

export function walletIsConnected () {
  return !!document._signer || (!!localStorage.getItem(WALLET_AUTH_KEY) && window.ethereum);
}

export async function getSigner (throwIfWrongChain = true) {
  if (document._signer) {
    return document._signer;
  }

  if (!window.ethereum) {
    throw new Error('Please visit this page with a dApp compatible browser');
  }

  // TODO: check for errors
  await new Promise(
    (resolve) => window.ethereum.sendAsync({ jsonrpc: '2.0', id: 1, method: 'eth_requestAccounts', params: [] }, resolve)
  );
  const signer = (new ethers.providers.Web3Provider(window.ethereum, 'any')).getSigner();
  const network = await signer.provider.getNetwork();

  if (throwIfWrongChain && network.chainId !== ROOT_CHAIN_ID) {
    const name = getNetworkName(ROOT_CHAIN_ID);
    throw new Error(`Please switch your wallet network to ${name}`);
  }

  // workaround that ethers.js requests eth_chainId for almost any call.
  signer.provider.detectNetwork = async () => network;
  document._signer = signer;
  localStorage.setItem(WALLET_AUTH_KEY, '1');

  return signer;
}

export async function displayFeedback (tag, target, tx) {
  function renderLink (str) {
    const isAddress = str.length == 42;
    const a = document.createElement('a');
    a.target = '_blank';

    if (ROOT_CHAIN_ID === 1) {
      a.href = `https://etherscan.io/`;
    } else {
      const network = ethers.providers.getNetwork(ROOT_CHAIN_ID);
      a.href = `https://${network.name}.etherscan.io/`;
    }

    if (isAddress) {
      a.textContent = `Contract(${str.substring(0, 16)}...)`;
      a.href += `address/${str}`;
    } else {
      a.textContent = `Transaction(${str.substring(0, 16)}...)`;
      a.href += `tx/${str}`;
    }

    return a;
  }

  const e = renderLink(tx.hash);
  e.textContent = 'Pending, ' + e.textContent;
  target.textContent = '';
  target.appendChild(e);

  const receipt = await tx.wait();
  e.textContent = e.textContent.replace('Pending', 'Done');
}

export function secondsToString (val) {
  let seconds = Number(val);
  if (seconds <= 0) {
    return '';
  }

  const MIN = 60;
  const HOUR = 3600;
  const DAY = HOUR * 24;
  const WEEK = DAY * 7;
  const UNITS = [WEEK, DAY, HOUR, MIN, 1];
  const NAMES = ['week', 'day', 'hour', 'minute', 'second'];
  let str = '';

  for (let i = 0, len = UNITS.length; i < len; i++) {
    const A = UNITS[i];
    const t = Math.floor(seconds / A);
    if (t > 0) {
      const U = NAMES[i];
      str += `${t} ${t == 1 ? U : U + 's'} `;
      seconds -= A * t;

      if (i > 1) {
        break;
      }
    }
  }

  return str;
}

export function wrapListener (selectorOrElement, func, eventName = 'click') {
  const el = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;

  async function handler (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    if (eventName !== 'keyup') {
      evt.target.disabled = true;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      await func(evt);
    } catch (e) {
      console.error(e);
      alertModal((e.error ? e.error.message : '') || e.message || e.toString());
    }

    evt.target.disabled = false;
  }

  el.disabled = false;
  el.addEventListener(
    eventName,
    handler,
    false
  );
}

export function getEtherscanLink (hashOrAddress) {
  const base = ROOT_CHAIN_ID === 1 ? 'https://etherscan.io' : `https://${ethers.providers.getNetwork(ROOT_CHAIN_ID).name}.etherscan.io`;
  if (hashOrAddress.length === 66) {
    // tx hash?
    return `${base}/tx/${hashOrAddress}`;
  }

  // address
  return `${base}/address/${hashOrAddress}`;
}

export function getEtherscanTokenLink (tokenAddr, account) {
  const base = ROOT_CHAIN_ID === 1 ? 'https://etherscan.io' : `https://${ethers.providers.getNetwork(ROOT_CHAIN_ID).name}.etherscan.io`;
  return `${base}/token/${tokenAddr}?a=${account}`;
}

export function alertModal (str) {
  const container = document.querySelector('.overlay .alert') || document.createElement('overlay');
  container.className = 'overlay alert';

  {
    const wrapper = document.createElement('section');
    const message = document.createElement('p');
    const btn = document.createElement('button');

    wrapper.className = 'item center';
    message.className = 'error';
    message.textContent = str;
    btn.textContent = 'Close';
    btn.addEventListener('click', () => container.remove(), false);

    wrapper.appendChild(message);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  }

  document.body.appendChild(container);
}

function sortTokens (tokenA, tokenB) {
  if (tokenA === tokenB) {
    throw new Error('identical');
  }

  const [token0, token1] = BigInt(tokenA) < BigInt(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
  if (!BigInt(token0)) {
    throw new Error('zero address');
  }

  return { token0, token1 };
}

export async function getRoute (uniswapFactory, path) {
  if (path.length === 0) {
    return [];
  }

  const pairs = [path[0]];
  for (let i = 0, len = path.length - 1; i < len;) {
    //(address input, address output) = (path[i], path[i + 1]);
    const tokenA = path[i++];
    const tokenB = path[i++];

    const { token0, token1 } = sortTokens(tokenA, tokenB);
    //(uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
    const direction = tokenA === token0 ? 0n : 1n;
    //(uint amount0Out, uint amount1Out) = direction == 0 ? (uint(0), amountOut) : (amountOut, uint(0));

    console.log({ token0, token1, direction });

    let pair;
    try {
      pair = await uniswapFactory.getPair(token0, token1);
    } catch (e) {
      console.log(e);
      return;
    }
    if (!BigInt(pair)) {
      //throw new Error('invalid pair');
      return;
    }
    pairs.push(BigInt(pair) << 1n | direction);
  }

  return pairs;
}

async function _signPermitDai (token, wallet, domain, spender, value) {
  const owner = await wallet.getAddress();
  const expiry = ~~(Date.now() / 1000) + 3600;
  const nonce = await token.nonces(owner);
  const args = {
    holder: owner,
    spender,
    nonce,
    expiry,
    allowed: !!BigInt(value)
  };
  const sig = await wallet._signTypedData(
    domain,
    { Permit: PERMIT_STRUCT_DAI },
    args
  );
  const { v, r, s } = ethers.utils.splitSignature(sig);
  const permitData =
    PERMIT_DAI.encodeFunctionData('permit', [args.holder, args.spender, args.nonce, args.expiry, args.allowed, v, r, s]);

  return Object.assign(args, { v, r, s, domain, permitData });
}

async function _signPermit (token, wallet, domain, spender, value) {
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
    console.log(e);
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

export async function signPermit (token, wallet, spender, value) {
  let domain;
  try {
    domain = await _findDomain(token, wallet);
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    const permit = await _signPermit(token, FAKE_WALLET, domain, spender, value);
    const ret = await wallet.provider.send('eth_call', [{ to: token.address, data: permit.permitData }, 'latest']);

    if (ret === '0x') {
      return _signPermit(token, wallet, domain, spender, value);
    }
  } catch (e) {
    console.log(e);
  }

  try {
    const permit = await _signPermitDai(token, FAKE_WALLET, domain, spender, value);
    const ret = await wallet.provider.send('eth_call', [{ to: token.address, data: permit.permitData }, 'latest']);

    if (ret === '0x') {
      return _signPermitDai(token, wallet, domain, spender, value);
    }
  } catch (e) {
    console.log(e);
  }
}

export function renderAddress (str) {
  return str.substring(0, 6) + '...' + str.substring(str.length - 4, str.length);
}

export function renderAmount (val, decimals) {
  const v = Number(decimals ? ethers.utils.formatUnits(val, decimals) : val);

  if (v < 1e3) {
    return `${v.toFixed(2)}`;
  }
  if (v < 1e6) {
    return `${(v / 1e3).toFixed(2)}K`;
  }
  if (v < 1e9) {
    return `${(v / 1e6).toFixed(2)}M`;
  }

  return `${(v / 1e9).toFixed(2)}MM`;
}

export function selectOnFocus (selectorOrElement) {
  const el = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
  for (const input of el.querySelectorAll('input')) {
    input.addEventListener('focus', (evt) => evt.target.select(), false);
  }
}

export function checkScroll (selectorOrElement, callback) {
  const el = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
  async function _check () {
    const fetchMore =
      (el.scrollHeight < window.innerHeight)
      || (el.scrollHeight - el.scrollTop) < window.innerHeight * 1.5;

    if (fetchMore) {
      try {
        await callback();
      } catch (e) {
        console.log(e);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    window.requestAnimationFrame(_check);
  }
  _check();
}

export async function setupTokenlist () {
  if (document.querySelector('datalist#tokenlist')) {
    return;
  }

  //const src = 'https://gateway.ipfs.io/ipns/tokens.uniswap.org';
  const src = '/lib/tokens.uniswap.org';
  const { tokens } = await (await fetch(src)).json();
  const datalist = document.createElement('datalist');

  for (const token of tokens) {
    if (token.chainId !== ROOT_CHAIN_ID) {
      continue;
    }

    const opt = document.createElement('option');
    opt.value = `${token.name} (${token.symbol}) ${token.address}`;
    datalist.appendChild(opt);
  }

  datalist.id = 'tokenlist';
  document.body.appendChild(datalist);
}

export async function getToken (val) {
  const defaultProvider = getProvider();
  const token = ethers.utils.getAddress(val.split(' ').pop());
  if (token.toLowerCase() === ethers.constants.AddressZero) {
    return { isETH: true, address: WETH, _decimals: 18,
      balanceOf: defaultProvider.getBalance.bind(defaultProvider),
    };
  }

  const tokenAddress = ethers.utils.isAddress(token) ? token : await defaultProvider.resolveName(token);
  const erc20 = await getErc20(tokenAddress);

  return erc20;
}

async function _getTokenCached (address) {
  const erc20 = await getErc20(address);
  try {
    if (erc20._name === undefined) {
      erc20._name = await erc20.name();
    }
    if (erc20._symbol === undefined) {
      erc20._symbol = await erc20.symbol();
    }
  } catch (e) {
    console.warn(e);
    const t = '??? - invalid';
    erc20._name = t;
    erc20._symbol = t;
  }

  return erc20;
}

export async function getTokenName (address) {
  return (await _getTokenCached(address))._name || '???';
}

export async function getTokenSymbol (address) {
  return (await _getTokenCached(address))._symbol || '???';
}

export function getConfig () {
  return CONFIGS[ROOT_CHAIN_ID];
}

export function getAttributes (ele) {
  const ret = {};

  for (const name of ele.getAttributeNames()) {
    ret[name] = ele.getAttribute(name);
  }

  return ret;
}

const _globalCache = Object.create(null);
export function getCache (key) {
  return _globalCache[key];
}

export function setCache (key, val) {
  _globalCache[key] = val;
}
