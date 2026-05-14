# Getting Started with Habitat Rollup

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) v14+ (LTS recommended)
- [Yarn](https://yarnpkg.com/) v1.x
- [MetaMask](https://metamask.io/) browser extension (for DApp interaction)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/0xHabitat/habitat-rollup.git
cd habitat-rollup
```

### 2. Bootstrap the Environment

Start the Docker containers:

```bash
docker-compose up --no-deps dev
```

This sets up:
- **geth** — Local Ethereum L1 node (port 8222)
- **web** — Web UI server (port 8080)
- **evolution** — Backend services (port 1111)
- **dev** — Development container with dependencies

> **Note:** You only need to run this once, and again if you change `node_modules` or Docker files.

### 3. Enter the Development Container

```bash
./scripts/dev.sh
```

This script:
- Enters the development Docker container
- Maps port 8111 for the NutBerry L2 node

### 4. Compile Contracts

Inside the dev container:

```bash
cd /app
yarn compile
```

### 5. Run the Bootstrap Environment

```bash
node receipts/simple.js
```

This provides a full-stack local environment with pre-funded accounts.

## Connecting MetaMask

### Development Network Configuration

| Setting | Value |
|---------|-------|
| **RPC URL** | `http://localhost:8222` |
| **Chain ID** | `99` |
| **Currency Symbol** | ETH |

### Steps

1. Open MetaMask → Add Network → Add Network Manually
2. Fill in the values above
3. Switch to the new network

### Troubleshooting

If you encounter strange errors in MetaMask:
1. Go to MetaMask Settings → Advanced
2. Click **Clear activity tab data** or **Reset account**
3. This resets the local transaction history without affecting on-chain state

## Running Tests

```bash
# Run all tests
yarn test

# Run specific test file(s)
yarn _test src/rollup/test/HabitatVoting.test.js
```

Tests use Mocha with a 15-minute timeout (some tests involve block production).

## Development Workflow

### Project Structure

```
habitat-rollup/
├── src/
│   ├── rollup/           # Core rollup contracts & logic
│   │   ├── contracts/    # Solidity smart contracts
│   │   ├── scripts/      # Deployment & utility scripts
│   │   ├── test/         # Contract tests
│   │   └── habitatV1.js  # EIP-712 type definitions
│   └── token/            # Token contracts (HBT, etc.)
│       ├── contracts/
│       ├── deployment/
│       └── test/
├── backends/
│   └── evolution/        # Backend services (Node.js)
├── web/                  # Frontend DApp
├── scripts/              # Dev scripts, deployment
├── docker/               # Docker configurations
├── docs/                 # Documentation
└── docker-compose.yml    # Local development stack
```

### Compiling Contracts

```bash
yarn compile
```

This runs the Solidity compiler (`solc 0.7.6`) via `scripts/compile.sh`.

### Generating Contract Documentation

```bash
yarn docs:solidity
```

This extracts NatSpec dev comments from Solidity contracts.

### Running the Web UI

The Web UI is available at `http://localhost:8080/` when Docker services are running.

For publishing:
```bash
# Edit web/config.js and web/config.css for your environment
pin=1 yarn ipfs-publish web/
```

## Deploying

```bash
GAS_GWEI=3 \
ROOT_RPC_URL=http://localhost:8222 \
PRIV_KEY=0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 \
./scripts/deploy.js
```

**Production deployment parameters:**
- `GAS_GWEI` — Gas price in Gwei
- `ROOT_RPC_URL` — Ethereum L1 RPC endpoint
- `PRIV_KEY` — Deployer private key (hex, with 0x prefix)

## NutBerry Node Setup

For detailed NutBerry optimistic rollup node configuration, see [nutberrySetup.md](../docs/nutberrySetup.md).

## Next Steps

- Read the [Architecture Guide](architecture.md) to understand the system design
- Check the [API Reference](API.md) for transaction types and contract interfaces
- Explore the [web UI](http://localhost:8080/) to interact with your local rollup
