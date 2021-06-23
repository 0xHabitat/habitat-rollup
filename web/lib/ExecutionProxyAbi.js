export default [
  'event ProxyCreated(address indexed bridge, address indexed vault, address proxy)',
  'function createProxy(address bridge, address vault) returns (address addr)',
  'function execute(bytes32 proposalId, bytes actions)',
  'function executed(bytes32) view returns (bool)',
  'function getMetadata() pure returns (address bridge, address vault)'
]
