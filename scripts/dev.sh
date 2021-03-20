#!/bin/sh

set -xe
docker-compose run --rm -p 8111:8111 dev -i
