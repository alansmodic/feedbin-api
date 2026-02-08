#!/bin/bash
set -e

cd mcp-server
npm install --production=false
npm run build
npm run start:http
