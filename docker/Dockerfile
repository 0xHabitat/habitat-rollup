FROM node:14-alpine AS base
WORKDIR /opt/node
COPY *.js *.json /opt/node/
CMD if [[ ! -z "$SWAP" ]]; then fallocate -l $(($(stat -f -c "(%a*%s/10)*7" .))) _swapfile && mkswap _swapfile && swapon _swapfile && ls -hla; fi; /opt/node/bricked-node.js
