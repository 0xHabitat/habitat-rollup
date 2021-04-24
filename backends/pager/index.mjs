import https from 'https';
import { parse } from 'url';
import { ethers } from 'ethers';

async function fetch (url, headers, payload) {
  return new Promise(
    function (resolve, reject) {
      const options = parse(url);
      options.headers = { 'user-agent': 'curl/7.64.1' };
      options.method = payload ? 'POST' : 'GET';
      if (headers) {
        Object.assign(options.headers, headers);
      }

      const req = https.request(url, options);
      req.setTimeout(FETCH_TIMEOUT_MS, () => req.abort());
      req.on('error', reject);
      req.on('socket', (socket) => socket.setTimeout(FETCH_TIMEOUT_MS));
      req.on('response', function (resp) {
        let data = '';
        resp.on('data', function (buf) {
          data += buf.toString();
        });
        resp.on('end', function () {
          resolve(data);
        });
      });
      req.end(payload);
    }
  );
}

const BRIDGE_ABI = [
  'event BlockBeacon()',
  'event Deposit(address token, address owner, uint256 value)',
  'event NewSolution(bytes32 solutionHash, uint256 blockNumber)',
  'event RollupUpgrade(address target)',
  'event Withdraw(address token, address owner, uint256 value)',
];
const FETCH_TIMEOUT_MS = 10000;
const UPDATE_INTERVAL = 30000;
const ADDRS = process.env.ADDRS.split(',');
const MIN_BALANCE = Number(process.env.MIN_BALANCE) || .3;
const { BRIDGE_ADDRESS, WEBHOOK } = process.env;

const bridgeInterface = new ethers.utils.Interface(BRIDGE_ABI);
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const eventFilter = {
  fromBlock: '0x0',
  toBlock: '0x0',
  address: BRIDGE_ADDRESS,
  topics: [
    [
      bridgeInterface.getEventTopic('BlockBeacon'),
      bridgeInterface.getEventTopic('Deposit'),
      bridgeInterface.getEventTopic('NewSolution'),
      bridgeInterface.getEventTopic('RollupUpgrade'),
      bridgeInterface.getEventTopic('Withdraw'),
    ]
  ],
};
let lastMessage = 0;

async function pager (str) {
  const resp = await fetch(WEBHOOK, { 'content-type': 'application/json' }, JSON.stringify({ content: str }));
  console.log({ str, resp });
}

async function checkBalances () {
  for (const addr of ADDRS) {
    const balance = Number(ethers.utils.formatUnits(await provider.getBalance(addr), 18));
    if (balance < MIN_BALANCE) {
      await pager(`Balance of ${addr} = ${balance}`);
    }
  }
}

async function checkEvents () {
  const latestBlock = await provider.getBlockNumber();
  const latestBlockStr = '0x' + latestBlock.toString(16);
  if (Number(eventFilter.toBlock) >= latestBlock) {
    return;
  }
  if (eventFilter.fromBlock === '0x0') {
    eventFilter.fromBlock = latestBlockStr;
  } else {
    eventFilter.fromBlock = '0x' + (Number(eventFilter.toBlock) + 1).toString(16)
  }
  eventFilter.toBlock = latestBlockStr;

  console.dir({ eventFilter });

  const networkName = (await provider.getNetwork()).name;
  const logs = await provider.send('eth_getLogs', [eventFilter]);
  for (const log of logs) {
    try {
      const evt = bridgeInterface.parseLog(log);
      await pager(`${evt.name} https://${networkName}.etherscan.io/tx/${log.transactionHash}`);
    } catch (e) {
      console.error(e);
    }
  }
}

setInterval(checkBalances, UPDATE_INTERVAL);
setInterval(checkEvents, UPDATE_INTERVAL);
