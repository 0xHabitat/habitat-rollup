
const OPTIONS = [
  {
    env: 'BRIDGE_ADDRESS',
    key: 'contract',
    type: String,
    required: true,
    help: 'The contract address of the Bridge on the root-chain.',
  },
  {
    env: 'PRIV_KEY',
    key: 'privKey',
    type: String,
    default: '',
    help: 'The private key for a root-chain account. That account should have some ether to be useful. ' +
    'Required to participate in the network.',
  },
  {
    env: 'PORT',
    key: 'rpcPort',
    type: Number,
    required: true,
    help: 'The port to listen on for the JSON-RPC interface.',
  },
  {
    env: 'HOST',
    key: 'host',
    type: String,
    default: 'localhost',
    help: 'The address to listen on for the JSON-RPC interface.',
  },
  {
    env: 'ROOT_RPC_URL',
    key: 'rootRpcUrl',
    type: String,
    required: true,
    help: 'The URL for the root-chain JSON-RPC provider.',
  },
  {
    env: 'EVENT_CHECK_MS',
    key: 'eventCheckMs',
    type: Number,
    default: 15000,
    help: 'Time in milliseconds to check for Bridge event updates.',
  },
  {
    env: 'DEBUG_MODE',
    key: 'debugMode',
    type: Number,
    default: 0,
    help: 'Debug mode, for development purposes.',
  },
  {
    env: 'BAD_NODE_MODE',
    key: 'badNodeMode',
    type: Number,
    default: 0,
    help: 'For development purposes, simulates a rogue node.',
  },
  {
    env: 'FEATURE_FLAGS',
    key: 'featureFlags',
    type: Number,
    default: 0,
    help: 'For development purposes at the moment, enables additional features.',
  },
  {
    env: 'BLOCK_SIZE_THRESHOLD',
    key: 'blockSizeThreshold',
    type: Number,
    default: 1000,
    help: 'Minimum size in bytes until a block becomes eligible for submission.',
  },
  {
    env: 'BLOCK_TIME_THRESHOLD',
    key: 'blockTimeThreshold',
    type: Number,
    default: 60,
    help: 'Time in seconds since last submitted block until a new block becomes eligible for submission regardless of the block size threshold.',
  },
  {
    env: 'SUBMIT_SOLUTION_THRESHOLD',
    key: 'submitSolutionThreshold',
    type: Number,
    default: 256,
    help: 'Defines the threshold of pending blocks without solutions until the node considers to submit solutions for pending blocks.',
  },
  {
    env: 'TYPED_DATA',
    key: 'typedData',
    type: String,
    default: '{}',
    help: 'EIP-712 typed data object. For rollup-bricks only.',
  },
];

function printHelp () {
  for (const option of OPTIONS) {
    console.log(`* Option: ${option.env}\n  * Type: ${option.type.name}`);
    if (option.default !== undefined) {
      console.log(`  * Default: ${option.default}`);
    }
    if (option.required) {
      console.log('  * Required: true');
    }
    if (option.help) {
      console.log(`  * ${option.help}`);
    }
  }
}

export default function () {
  const config = {};

  for (const option of OPTIONS) {
    const v = process.env[option.env] || option.default;

    if (option.required && v === undefined) {
      printHelp();
      throw new Error(`${option.env} is a required argument.`);
    }
    config[option.key] = option.type(v);
  }

  return config;
}
