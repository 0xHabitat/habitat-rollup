
# Development

Use `docker-compose up --exit-code-from dev` to bootstrap the environment.
Enter the development container with `docker-compose run dev sh`, the root folder is mounted at `/app`.

Additionally, use `docker-compose run -p 8111:8111 dev sh` to establish a port mapping.

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

# Deploy

```
GAS_GWEI=3 ROOT_RPC_URL=http://localhost:8222 PRIV_KEY=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 ./scripts/deploy.js
```

### web/

Edit `web/config.{js,css}` and publish to ipfs via `pin=1 yarn ipfs-publish web/`.
