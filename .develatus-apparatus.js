export default {
  testCommand: 'ROOT_RPC_URL=http://localhost:8333/ yarn test',
  artifactsPath: 'build/contracts',
  proxyPort: 8333,
  rpcUrl: process.env.ROOT_RPC_URL,
  fuzzyMatchFactor: 0.8,
  ignore: /(node_modules|mocks|test)\/.*\.sol/,
  solcSettings: {
    evmVersion: 'berlin',
    optimizer: {
      enabled: true,
      runs: 256,
      details: {
        peephole: true,
        orderLiterals: false,
        deduplicate: true,
        cse: true,
        constantOptimizer: true,
        yul: false,
      },
    },
    metadata: {
      'bytecodeHash': 'none',
    },
  },
}
