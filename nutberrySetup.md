# NutBerry node for Habitat on Raspberry Pi
This document describes how to setup and run NutBerry (optimistic rollups) node for Habitat. It is focused on Raspberry Pi but should be applicable to other environments. 

## Setup overview
Along with NutBerry (https://github.com/NutBerry) itslef this setup uses SWAG (https://hub.docker.com/r/linuxserver/swag) as gateway and DuckDNS (duckdns.org) for mapping of dynamic IP to domain name. Infura is used as Ethereum node.
This setup was tested on Raspberry Pi 3B+ running on Raspberry Pi OS (ex. Raspbian) (https://www.raspberrypi.org/downloads/raspberry-pi-os/)

## DuckDNS
Habitat accesses NutBerry node via gateway and domain name (and not just IP) should be used. In this setup DuckDNS was used to provide domain name as well as mitigate dynamic DNS. It is not required for environments that already have their own domain name. DuckDNS setup instructions can be found here: http://www.duckdns.org/install.jsp.

## Firewall/NAT
Ports 80 and 443 (gateway) should be open while 8080 (NutBerry port that should only be used by gateway) should be closed.

## Fund the node
Node needs some funds for gas to submit transactions on Ethereum mainnet. So address should be created and funded with some ETH. Private Key of this address will be used later in configuration.

## Install Docker
Both NutBerry and SWAG run as Docker images. So having Docker and Docker-Compose are prerequisites:
```
sudo apt install docker docker-compose
```

## Folder structure
Create folders that will be mapped to Docker images
```
mkdir habitat
cd habitat
mkdir config
mkdir data
```

## Docker config
Inside `habitat` folder create `docker-compose.yml` file. The contents of the file are below (don't forget to put actual values to `$INFURA_KEY`, `$NODE_PK`, `$HABITAT_BRIDGE`, `$TIMEZONE`, `$EMAIL`, `$DUCK_DNS_DOMAIN` (if using DuckDNS) and `$DUCK_DNS_TOKEN` (if using DuckDNS)).

Contents of `docker-compose.yml`:
```
version: "3"
services:
  nutberry:
    image: ghcr.io/nutberry/artifacts/bricked:latest
    container_name: nutberry
    restart: unless-stopped
    environment:
      - PORT=8080 
      - HOST=0.0.0.0
      - TYPED_DATA={"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"}],"InitMoloch":[{"name":"nonce","type":"uint256"},{"name":"summoner","type":"address"},{"name":"approvedToken","type":"address"},{"name":"periodDuration","type":"uint256"},{"name":"votingPeriod","type":"uint256"},{"name":"gracePeriod","type":"uint256"},{"name":"abortWindow","type":"uint256"},{"name":"dilutionBound","type":"uint256"},{"name":"summoningTime","type":"uint256"}],"SubmitProposal":[{"name":"nonce","type":"uint256"},{"name":"startingPeriod","type":"uint256"},{"name":"title","type":"string"},{"name":"details","type":"string"},{"name":"actions","type":"bytes"}],"SubmitVote":[{"name":"proposalIndex","type":"uint256"},{"name":"uintVote","type":"uint8"}],"ProcessProposal":[{"name":"proposalIndex","type":"uint256"}],"Ragequit":[{"name":"nonce","type":"uint256"},{"name":"sharesToBurn","type":"uint256"}],"Abort":[{"name":"proposalIndex","type":"uint256"}],"UpdateDelegateKey":[{"name":"nonce","type":"uint256"},{"name":"newDelegateKey","type":"address"}]},"domain":{"name":"GovBrick","version":"1"},"primaryTypes":["InitMoloch","SubmitProposal","SubmitVote","ProcessProposal","Ragequit","Abort","UpdateDelegateKey"]}
      - EVENT_CHECK_MS=6000
      - BLOCK_SIZE_THRESHOLD=31000
      - BLOCK_TIME_THRESHOLD=99999999
      - SUBMIT_SOLUTION_THRESHOLD=256
      - ROOT_RPC_URL=https://mainnet.infura.io/v3/$INFURA_KEY
      - PRIV_KEY=$NODE_PK
      - BRIDGE_ADDRESS=$HABITAT_BRIDGE
    volumes:
      - ./data/nutberry:/opt/node/data
    ports:
      - 8080:8080
  swag:
    image: linuxserver/swag
    container_name: swag
    cap_add:
      - NET_ADMIN
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=$TIMEZONE
      - URL=$DUCK_DNS_DOMAIN
      - SUBDOMAINS=
      - VALIDATION=http
      - EMAIL=$EMAIL
      - STAGING=false
      - DUCKDNSTOKEN=$DUCK_DNS_TOKEN
    volumes:
      - ./config:/config
    ports:
      - 80:80
      - 443:443
    restart: unless-stopped
```

## Start the node
To run the node use the following comand from in `habitat` folder
`sudo docker-compose up -d`

This will download the images and run them. On the first run SWAG will also create certificates. Last step is to forward calls to NutBerry. Edit `config/nginx/site-confs/default`: add following line in `location /` in `server` section `# main server block`:
`proxy_pass http://nutberry:8080;`
So it will look like this:
```
	location / {
#		try_files $uri $uri/ /index.html /index.php?$args =404;
		proxy_pass http://nutberry:8080;
	}
```
After this restart SWAG:
`sudo docker restart swag`

To check NutBerry logs use the following command:
`sudo docker logs nutberry -f`
