#!/usr/bin/env bash
set -euo pipefail

BASE="${PRODUCTION_URL:-https://new.cribsheets.com.au}"
URL="${BASE%/}/api/health"
MAX_ATTEMPTS="${HEALTH_MAX_ATTEMPTS:-36}"
SLEEP_SECS="${HEALTH_SLEEP_SECS:-10}"

echo "Waiting for ${URL} (up to $((MAX_ATTEMPTS * SLEEP_SECS))s)..."

for ((i = 1; i <= MAX_ATTEMPTS; i++)); do
  if body="$(curl -fsS "$URL" 2>/dev/null)"; then
    if echo "$body" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
      if echo "$body" | grep -q '"staticUi"[[:space:]]*:[[:space:]]*true'; then
        echo "OK: $body"
        exit 0
      fi
      echo "Attempt $i: health ok but staticUi not ready — $body"
    else
      echo "Attempt $i: unexpected body — $body"
    fi
  else
    echo "Attempt $i: not reachable yet"
  fi
  sleep "$SLEEP_SECS"
done

echo "Production health check failed after ${MAX_ATTEMPTS} attempts."
exit 1
