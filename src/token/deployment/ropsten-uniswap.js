import { wallet } from './lib.js';

const UNISWAP_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const INPUT_TOKEN = '0x217582928Fb133171e2c5Ca019429a3831DD9537';
const WETH = '0xc778417E063141139Fce010982780140Aa0cD5Ab';
const uniswapFactory = new ethers.Contract(UNISWAP_FACTORY, ['function createPair(address,address)'], wallet);
const tx = await uniswapFactory.createPair(INPUT_TOKEN, WETH);
console.log(tx);
