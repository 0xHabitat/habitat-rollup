Environment variables can be passed via a `.env` file,
the variables in the `.yml` can also be edited directly or pass them via shell `FOO=BAR docker-compose -f node-simple.yml ...`.

### Infura, problems with Bridge events

Due to inconsistencies for `eth_getLogs` on Infura, you can use this proxy that helps to detect those issues:
```
https://rpc-proxy.fly.dev/https://mainnet.infura.io/v3/<YOUR API TOKEN>
```

Change the URL after the `.dev/` to your requirements.

#### Alternative

Host your own ethereum node and use that instead.
