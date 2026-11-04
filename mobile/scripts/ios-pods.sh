#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -d "$ROOT/../patches" ]]; then
  echo "→ Applying npm patches…"
  (cd "$ROOT/.." && npx patch-package)
fi

cd "$ROOT"
if [[ -f Gemfile ]]; then
  bundle install
  (cd ios && bundle exec pod install)
else
  cd ios && pod install
fi
