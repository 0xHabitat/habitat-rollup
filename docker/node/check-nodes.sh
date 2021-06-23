#!/bin/sh

#self=$(grep fly-local-6pn /etc/hosts | cut -f 1)
self='localhost'
curl "http://$self:8080" -d '{"method":"eth_blockNumber"}' | grep -v 'not ready';
