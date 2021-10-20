import { ROOT_CHAIN_ID, L1_RPC_URL, CONFIGS } from './config.js';
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
  'function transferFrom(address,address,uint256) returns (bool)'
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

const FAKE_WALLET = new ethers.Wallet('0x88426e5c8987b3ec0b7cb58bfedc420f229a548d1e6c9d7d0ad0066c3f69e87f');
const PERMIT_DAI = new ethers.utils.Interface(
  ['function permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed,uint8 v,bytes32 r,bytes32 s)']
);
const PERMIT_EIP_2612 = new ethers.utils.Interface(
  ['function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)']
);
const ERC_INTERFACE = new ethers.utils.Interface(ERC20_ABI);

document._utilsCache = {};
document._utilsProviders = {};

export function getNetwork () {
  return ROOT_CHAIN_ID;
}

export const RPC_CORS_HEADER_FIX = { 'content-type': 'text/plain' };

export function getProvider (chainId) {
  if (chainId === undefined) {
    chainId = ROOT_CHAIN_ID;
  }
  let provider = document._utilsProviders[chainId];

  if (!provider || (provider._network && provider._network.chainId !== chainId)) {
    const url = L1_RPC_URL;
    provider = new ethers.providers.JsonRpcProvider({ url, headers: url.indexOf('infura') === -1 ? {} : RPC_CORS_HEADER_FIX }, 'any');
    // workaround that ethers.js requests eth_chainId for almost any call.
    const network = ethers.providers.getNetwork(chainId);
    provider.detectNetwork = async () => network;
    document._utilsProviders[chainId] = provider;
  }

  return provider;
}

export function getNetworkName (id) {
  const networkName = ethers.providers.getNetwork(id).name;
  return networkName === 'homestead' ? 'mainnet' : networkName;
}

export async function getErc20 (addr) {
  if (!document._utilsCache[addr]) {
    const tkn = new ethers.Contract(addr, ERC20_ABI, getProvider());
    tkn._decimals = 18;
    try {
      tkn._decimals = await tkn.decimals();
    } catch (e) {
      console.error(e);
    }
    document._utilsCache[addr] = tkn;
  }

  return document._utilsCache[addr];
}

const WALLET_AUTH_KEY = '_utils_wallet_auth';

export function walletIsConnected () {
  return !!document._signer || (window.ethereum && window.ethereum.selectedAddress);
}

export async function getSigner (throwIfWrongChain = true) {
  if (document._signer) {
    const net = document._signer.provider._network;
    if (net && net.chainId === ROOT_CHAIN_ID) {
      return document._signer;
    }
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
    return '-';
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

const INTERACTION_DELAY = 500;
let _lastInteraction = 0;
export function wrapListener (selectorOrElement, func, eventName = 'click') {
  const el = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;

  async function handler (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    const target = evt.target;

    if (eventName !== 'keyup') {
      target.disabled = true;
    } else {
      const now = Date.now();
      const delta = now - _lastInteraction;
      _lastInteraction = now;

      if (delta < INTERACTION_DELAY) {
        await new Promise((resolve) => setTimeout(resolve, INTERACTION_DELAY - delta));
      }
    }

    try {
      await func(evt);
    } catch (e) {
      console.error(e);
      alertModal((e.error ? e.error.message : '') || e.message || e.toString());
    }

    target.disabled = false;
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
  return `${base}/token/${tokenAddr}${account ? '?a=' + account : ''}`;
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

export function renderAmount (val, decimals, precision = 3) {
  const v = Number(decimals ? ethers.utils.formatUnits(val, decimals) : val);
  const intl = new Intl.NumberFormat([], { maximumFractionDigits: precision });

  if (v < 1e3) {
    return intl.format(v);
  }
  if (v < 1e6) {
    return `${intl.format(v / 1e3)}K`;
  }
  if (v < 1e9) {
    return `${intl.format(v / 1e6)}M`;
  }

  return `${intl.format(v / 1e9)}G`;
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
      let ret = false;
      try {
        ret = await callback();
      } catch (e) {
        console.log(e);
      }
      if (!ret) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    window.requestAnimationFrame(_check);
  }
  _check();
}

let _getTokenListPromise;
export async function getTokenList () {
  if (!document._tokenlist) {
    if (!_getTokenListPromise) {
      const src = '/lib/tokenlist.json';
      _getTokenListPromise = fetch(src).then((r) => r.json());
    }
    const { tokens } = await _getTokenListPromise;
    document._tokenlist = tokens;
    _getTokenListPromise = undefined;
  }

  return document._tokenlist;
}

export async function setupTokenlist () {
  if (document.querySelector('datalist#tokenlist')) {
    return;
  }

  const tokens = await getTokenList();
  const datalist = document.createElement('datalist');

  for (const token of tokens) {
    if (token.chainId !== ROOT_CHAIN_ID) {
      continue;
    }

    const opt = document.createElement('option');
    opt.value = `${token.name} (${token.symbol}) ${token.address}`;
    datalist.appendChild(opt);
  }

  {
    // special - ETH
    const opt = document.createElement('option');
    opt.value = 'ETH';
    datalist.append(opt);
  }

  datalist.id = 'tokenlist';
  document.body.appendChild(datalist);
}

export async function setupTokenlistV2 (root, force = false) {
  const QUERY = 'datalist#tokenlistv2';
  {
    const e = document.body.querySelector(QUERY);
    if (e) {
      if (force) {
        console.log('tokenlistv2 force update');
        e.remove();
      } else {
        if (root) {
          root.append(e.cloneNode(true));
          const refs = document._tokenListConsumers || [];
          refs.push(new WeakRef(root));
          document._tokenListConsumers = refs;
        }
        return;
      }
    }
  }

  const datalist = document.createElement('datalist');
  datalist.id = 'tokenlistv2';
  document.body.append(datalist);

  const tokens = await getTokenList();

  for (const token of tokens) {
    if (token.chainId !== ROOT_CHAIN_ID) {
      continue;
    }

    const opt = document.createElement('option');
    const shortAddr = getShortAddr(token.address);
    opt.value = `${token.symbol} (${token.name}) ${shortAddr}`;
    datalist.append(opt);
  }

  {
    // special - ETH
    const opt = document.createElement('option');
    opt.value = 'ETH';
    datalist.append(opt);
  }

  const refs = document._tokenListConsumers || [];

  if (root) {
    root.append(datalist.cloneNode(true));
    const ref = new WeakRef(root);
    refs.push(ref);
  }

  const newList = [];
  for (const weakRef of refs) {
    const e = weakRef.deref();
    if (!e) {
      continue;
    }

    newList.push(weakRef);
    const oldList = e.querySelector(QUERY);
    if (oldList) {
      oldList.remove();
    }
    console.log('updated', e);
    e.append(datalist.cloneNode(true));
  }
  document._tokenListConsumers = newList;
}

export async function getToken (val) {
  const defaultProvider = getProvider();

  if (val.length < 42 && val !== 'ETH') {
    const tag = '#tokenlistv2';
    const ele = document.querySelector(tag);
    if (!ele) {
      await setupTokenlistV2();
      ele = document.querySelector(tag);
    }

    for (const option of ele.children) {
      if (option.value === val) {
        val = option.textContent;
      }
    }
  }

  if (val === 'ETH') {
    const { WETH } = getConfig();
    const _erc = await getErc20(WETH);
    return { isETH: true, address: WETH, _decimals: 18,
      balanceOf: defaultProvider.getBalance.bind(defaultProvider),
      interface: _erc.interface,
    };
  }

  const token = ethers.utils.getAddress(val.split(' ').pop());
  const tokenAddress = ethers.utils.isAddress(token) ? token : await defaultProvider.resolveName(token);
  const erc20 = await _getTokenCached(tokenAddress);

  return erc20;
}


function tokenFilter (e, search) {
  return e.chainId === ROOT_CHAIN_ID &&
    (
      e.address.toLowerCase() === search ||
      e.symbol.toLowerCase() === search ||
      e.name.toLowerCase() === search
    );
}

export async function getTokenV2 (val) {
  const cache = document._tokensV2 || Object.create(null);
  document._tokensV2 = cache;

  const hints = val.toLowerCase();
  const tokenTag = hints.split(' ').shift();

  if (cache[tokenTag]) {
    return cache[tokenTag];
  }

  console.log('cache miss', tokenTag);

  const isETH = tokenTag === 'eth';
  const search = tokenTag;
  const tokens = (await getTokenList()).filter((e) => tokenFilter(e, search));
  let tokenInfo = tokens.length ? tokens[0] : undefined;

  if (tokens.length > 1) {
    // try to nail it down
    tokenInfo = tokens.find(e => hints.endsWith(getShortAddr(e.address)));
    if (!tokenInfo) {
      throw new Error(`There are ${tokens.length} matching tokens. Please provide the address of the token`);
    }
  }

  if (!tokenInfo) {
    const defaultProvider = getProvider();
    const tokenAddress = isETH ? getConfig().WETH : (ethers.utils.isAddress(tokenTag) ? tokenTag : await defaultProvider.resolveName(tokenTag)).toLowerCase();
    const contract = await _getTokenCached(tokenAddress);

    tokenInfo = {
      name: contract._name || '<NO NAME>',
      symbol: contract._symbol || '<NO SYMBOL>',
      decimals: contract._decimals || 1,
      address: tokenAddress,
    };
  }

  if (isETH || tokenInfo.address === ethers.constants.AddressZero) {
    tokenInfo = Object.assign({}, tokenInfo);
    tokenInfo.isETH = true;
    const defaultProvider = getProvider();
    tokenInfo.contract = { balanceOf: (a) => defaultProvider.getBalance(a) };
    tokenInfo.interface = ERC_INTERFACE;
  } else {
    tokenInfo.interface = ERC_INTERFACE;
    tokenInfo.contract = new ethers.Contract(tokenInfo.address, ERC20_ABI, getProvider());
  }

  if (!tokenInfo.logoURI) {
    tokenInfo.logoURI = '/lib/assets/icons/unknown.svg';
  }

  cache[tokenTag] = tokenInfo;
  return tokenInfo;
}

export async function _addToTokenCache (tokenInfo) {
  const cache = document._tokensV2 || Object.create(null);
  document._tokensV2 = cache;

  const address = tokenInfo.address.toLowerCase();
  const name = tokenInfo.name.toLowerCase();
  const symbol = tokenInfo.symbol.toLowerCase();
  const tokenList = await getTokenList();

  // check if we would overwrite entries from the tokenlist
  for (const token of tokenList) {
    if (token.address.toLowerCase() === address) {
        console.warn('trying to overwrite', tokenInfo);
        return;
    }
  }
  // only add address to cache to avoid overwriting duplicate symbols
  cache[address] = tokenInfo;

  if (!tokenList.find((e) => e.address.toLowerCase() === address)) {
    console.log('add token to list', tokenInfo);
    tokenList.push(tokenInfo);
    await setupTokenlistV2(null, true);
  }
}

export async function _getTokenCached (address) {
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

export function getConfig () {
  return CONFIGS[ROOT_CHAIN_ID];
}

const _globalCache = Object.create(null);
export function getCache (key) {
  return _globalCache[key];
}

export function setCache (key, val) {
  _globalCache[key] = val;
}

export function encodeMultiCall (ary) {
  let calldata = '0x';

  for (const obj of ary) {
    const data = obj.calldata.replace('0x', '');
    const dataSize = data.length / 2;

    calldata += obj.address.replace('0x', '').toLowerCase().padStart(64, '0') +
      BigInt(obj.value).toString(16).padStart(64, '0') +
      dataSize.toString(16).padStart(64, '0') +
      data;
  }

  return calldata;
}

const dateTimeFormat = new Intl.DateTimeFormat([], { dateStyle: 'short', timeStyle: 'long' });
export function formatDate (v) {
  return dateTimeFormat.format(v);
}

export function sanitize (html) {
  const ALLOWED_ELEMENTS = [
    HTMLElement,
    HTMLAnchorElement,
    HTMLBRElement,
    HTMLDListElement,
    HTMLDetailsElement,
    HTMLDivElement,
    HTMLHRElement,
    HTMLHeadingElement,
    HTMLImageElement,
    HTMLLIElement,
    HTMLLabelElement,
    HTMLParagraphElement,
    HTMLPictureElement,
    HTMLPreElement,
    HTMLQuoteElement,
    HTMLSourceElement,
    HTMLSpanElement,
    HTMLTableCaptionElement,
    HTMLTableCellElement,
    HTMLTableColElement,
    HTMLTableElement,
    HTMLTableRowElement,
    HTMLTableSectionElement,
    HTMLTimeElement,
    HTMLUListElement,
  ];
  const ALLOWED_ATTRIBUTES = ['src', 'media', 'sizes', 'srcset', 'type', 'href'];

  const e = document.createElement('template');
  e.innerHTML = html;

  for (const node of e.content.querySelectorAll('*')) {
    if (ALLOWED_ELEMENTS.indexOf(node.constructor) === -1) {
      console.log('not allowed', node.toString());
      node.remove();
      continue;
    }
    const attrs = node.getAttributeNames();
    for (const attr of attrs) {
      if (ALLOWED_ATTRIBUTES.indexOf(attr) === -1) {
        node.removeAttribute(attr);
        continue;
      }
      if (attr === 'href') {
        node.setAttribute('target', '_blank');
      }
    }
  }

  return e.content;
}

export function parseInput (ele) {
  const elements = ele.querySelectorAll('input,textarea');
  const config = {};

  let error = false;
  for (const ele of elements) {
    ele.classList.remove('error');
    if (!ele.value) {
      window.requestAnimationFrame(() => ele.classList.add('error'));
      error = true;
      continue;
    }
    config[ele.id] = ele.value;
  }

  return { config, error };
}

export function getShortAddr (str) {
  return str.substring(0, 4) + '...' + str.substring(40, 42);
}
