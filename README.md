[![Coverage Status](https://coveralls.io/repos/github/0xHabitat/habitat/badge.svg?branch=master)](https://coveralls.io/github/0xHabitat/habitat?branch=master)

# Development

Use `docker-compose up --no-deps dev` to bootstrap the environment,
you only need to do this once and if you changed node_modules and/or docker files.

Enter the development container with `./scripts/dev.sh`.
This script also establishes a port(8111) mapping, the NutBerry node listens on that port.

Then change the directory inside the container `cd /app` and run `node receipts/simple.js` for a simple bootstrap environment.

Note: You may need to run `yarn compile` first.

That provides you with a full stack environment in combination with `receipts/simple.js`.

### Compiling Contracts

Run `yarn compile` inside the docker container.

### UI

The Web UI is available at `http://localhost:8080/`.

### Tests

Run the tests with `yarn test`.
You can run single/multiple tests only with `yarn _test path/to/file(s)`.

### MetaMask - connect to development root chain (geth)

rpc url: `http://localhost:8222`
chainId: `99`

### MetaMask - common errors

Try to reset the `account history` in MetaMask if you experience strange ~~visions~~ errors.

# Deploy

```
GAS_GWEI=3 ROOT_RPC_URL=http://localhost:8222 PRIV_KEY=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 ./scripts/deploy.js
```

### web/

Edit `web/config.{js,css}` and publish to ipfs via `pin=1 yarn ipfs-publish web/`.

## NutBerry node setup

Habitat uses NutBerry optimistic rollups. For setup of the node see: [NutBerry setup](nutberrySetup.md)
