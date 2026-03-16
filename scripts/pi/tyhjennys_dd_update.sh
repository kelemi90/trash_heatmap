#!/usr/bin/env bash
# Minimal dynamic-DNS update script template for dy.fi
# Edit DYFI_UPDATE_URL to your provider's update endpoint and DYFI_TOKEN as needed.

set -euo pipefail

# Example: DYFI_UPDATE_URL='https://dy.fi/update?host=tyhjennys&token=TOKEN'
DYFI_UPDATE_URL="${DYFI_UPDATE_URL:-}" # set in env or export before running

if [ -z "$DYFI_UPDATE_URL" ]; then
  echo "Set DYFI_UPDATE_URL environment variable to your dy.fi update URL." >&2
  exit 2
fi

IP=$(curl -sS https://checkip.amazonaws.com || curl -sS https://ifconfig.co)
echo "Current public IP: $IP"

# If the provider accepts an ip parameter, append it. Otherwise include it in the URL.
if [[ "$DYFI_UPDATE_URL" != *"ip="* ]]; then
  UPDATE_URL="$DYFI_UPDATE_URL&ip=$IP"
else
  UPDATE_URL="$DYFI_UPDATE_URL"
fi

echo "Calling $UPDATE_URL"
RESP=$(curl -sS "$UPDATE_URL")
echo "Response: $RESP"

# Return 0 so cron/systemd considers it successful by default
exit 0
