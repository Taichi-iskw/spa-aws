#!/bin/bash

# === 設定 ===
OIDC_URL="https://token.actions.githubusercontent.com"
CLIENT_ID_LIST='["sts.amazonaws.com"]'
THUMBPRINT_LIST='["6938fd4d98bab03faadb97b34396831e3780aea1"]'  # GitHubの固定値

# === 作成実行 ===
aws iam create-open-id-connect-provider \
  --url "$OIDC_URL" \
  --client-id-list "$CLIENT_ID_LIST" \
  --thumbprint-list "$THUMBPRINT_LIST"
