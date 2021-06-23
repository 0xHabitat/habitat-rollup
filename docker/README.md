TODO: outdated

Environment variables can be passed via a `.env` file,
the variables in the `.yml` can also be edited directly or pass them via shell `FOO=BAR docker-compose -f node-simple.yml ...`.


### Updating images

Use the usual `docker-compose pull && docker-compose up -d` commando.


### Infura, problems with Bridge events

Due to inconsistencies for `eth_getLogs` on Infura, you can use this proxy that helps to detect those issues:
```
https://rpc-proxy.fly.dev/https://mainnet.infura.io/v3/<YOUR API TOKEN>
```

Change the URL after the `.dev/` to your requirements.

#### Alternative

Host your own ethereum node and use that instead.


# Hosting via fly.io (docker)

```
# create a fly.io application via flyctl

mkdir YOUR_PROJECT_DIRECTORY && cd YOUR_PROJECT_DIRECTORY
# follow instructions
flyctl init

# set NutBerry secrets & config // change to your liking

flyctl secrets set \
  SUBMIT_SOLUTION_THRESHOLD=1 \
  SWAP=1 \
  EVENT_CHECK_MS=6000 \
  BLOCK_SIZE_THRESHOLD=31000 \
  BLOCK_TIME_THRESHOLD=60 \
  BRIDGE_ADDRESS=0xHABITAT_BRIDGE \
  ROOT_RPC_URL=https://rpc-proxy.fly.dev/https://mainnet.infura.io/v3/YOUR_INFURA_API_KEY \
  PRIV_KEY=0xYOUR_PRIV_KEY \
  PORT=8080 HOST=0.0.0.0 \
  TYPED_DATA='{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"}],"InitMoloch":[{"name":"nonce","type":"uint256"},{"name":"summoner","type":"address"},{"name":"approvedToken","type":"address"},{"name":"periodDuration","type":"uint256"},{"name":"votingPeriod","type":"uint256"},{"name":"gracePeriod","type":"uint256"},{"name":"abortWindow","type":"uint256"},{"name":"dilutionBound","type":"uint256"},{"name":"summoningTime","type":"uint256"}],"SubmitProposal":[{"name":"nonce","type":"uint256"},{"name":"startingPeriod","type":"uint256"},{"name":"title","type":"string"},{"name":"details","type":"string"},{"name":"actions","type":"bytes"}],"SubmitVote":[{"name":"proposalIndex","type":"uint256"},{"name":"uintVote","type":"uint8"}],"ProcessProposal":[{"name":"proposalIndex","type":"uint256"}],"Ragequit":[{"name":"nonce","type":"uint256"},{"name":"sharesToBurn","type":"uint256"}],"Abort":[{"name":"proposalIndex","type":"uint256"}],"UpdateDelegateKey":[{"name":"nonce","type":"uint256"},{"name":"newDelegateKey","type":"address"}]},"domain":{"name":"GovBrick","version":"1"},"primaryTypes":["InitMoloch","SubmitProposal","SubmitVote","ProcessProposal","Ragequit","Abort","UpdateDelegateKey"]}'

# deploy app with NutBerry image

flyctl deploy -i ghcr.io/nutberry/artifacts/bricked:latest
```
