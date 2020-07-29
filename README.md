
# Development

Run the tests with `yarn test`.
You can run single/multiple tests only with `yarn _test path/to/file(s)`.
The test require `geth` version `1.9.9` is recommended and you can grab it here: `https://geth.ethereum.org/downloads/`.


# Deploy

```
GAS_GWEI=3 ROOT_RPC_URL=http://localhost:8222 PRIV_KEY=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 ./scripts/deploy.js
```
