#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../ios"
bundle install
bundle exec pod install
