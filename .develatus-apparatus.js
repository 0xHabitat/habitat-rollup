export default {
  testCommand: 'ROOT_RPC_URL=http://localhost:8333/ yarn test',
  artifactsPath: 'build/contracts',
  proxyPort: 8333,
  rpcUrl: process.env.ROOT_RPC_URL,
  fuzzyMatchFactor: 0.8
}
