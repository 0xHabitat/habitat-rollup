#!/bin/sh

set -xe

cat | docker build -f - -t tmp docker/ << 'EOF'
FROM flyio/flyctl:v0.0.233 as flyio
FROM alpine:3.14
COPY --from=flyio /flyctl /
RUN apk add curl bind-tools go-ipfs
EOF

docker run --rm -w /app -v $(pwd):/app -e IPFS_API=$IPFS_API -e WEB_PATH=$WEB_PATH -e FLY_ACCESS_TOKEN=$FLY_ACCESS_TOKEN -e DOMAIN=$DOMAIN tmp sh scripts/publish-web.sh
