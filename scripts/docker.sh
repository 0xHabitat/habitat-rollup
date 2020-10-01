#!/bin/sh

set -x

tag='ghcr.io/nutberry/artifacts/habitat:latest'

pushd docker/
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 -t $tag --push .
docker buildx imagetools inspect $tag
