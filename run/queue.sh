#!/usr/bin/env bash
cd "$(dirname "$0")/.."
node --no-warnings scripts/queue.js
read -n 1 -s -r -p "Press any key to continue..."
