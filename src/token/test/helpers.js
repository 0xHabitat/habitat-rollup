import ethers from 'ethers';

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
    const pair = await uniswapFactory.getPair(token0, token1);
    if (!BigInt(pair)) {
      throw new Error('invalid pair');
    }
    pairs.push(BigInt(pair) << 1n | direction);
  }

  return pairs;
}

export async function signPermitDai (token, wallet, spender, value) {
  const expiry = ~~(Date.now() / 1000) + 3600;
  const nonce = await token.nonces(wallet.address);
  const domain = { name: await token.name(), version: '1', chainId: await wallet.getChainId(), verifyingContract: token.address };
  const args = {
    holder: wallet.address,
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
    token.interface.encodeFunctionData('permit', [args.holder, args.spender, args.nonce, args.expiry, args.allowed, v, r, s]);

  return Object.assign(args, { v, r, s, domain, permitData });
}

export async function signPermit (token, wallet, spender, value) {
  const deadline = ~~(Date.now() / 1000) + 3600;
  const nonce = await token.nonces(wallet.address);
  const name = await token.name();
  const domain = { name, chainId: await wallet.getChainId(), verifyingContract: token.address };
  const args = {
    owner: wallet.address,
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
    token.interface.encodeFunctionData('permit', [args.owner, args.spender, args.value, args.deadline, v, r, s]);

  return Object.assign(args, { v, r, s, domain, permitData });
}

