FROM node:lts-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN mkdir data
RUN yarn
COPY *.mjs /app/
CMD if [[ ! -z "$SWAP" ]]; then fallocate -l $(($(stat -f -c "(%a*%s/10)*7" .))) _swapfile && mkswap _swapfile && swapon _swapfile && ls -hla; fi; node index.mjs
