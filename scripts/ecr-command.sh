#!/usr/bin/env bash
set -euo pipefail

### === 設定セクション ===
REGION="ap-northeast-1"
ACCOUNT_ID="668429317101"
REPO_NAME="sample-flask-repo"
IMAGE_TAG="latest"

ECR_HOST="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
ECR_URI="${ECR_HOST}/${REPO_NAME}:${IMAGE_TAG}"

echo "🔑 1) ECR にログイン"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_HOST}"

echo
echo "🐳 2) Docker イメージをビルド (Linux x86_64 互換)"
docker build --platform linux/amd64 -t "${REPO_NAME}:${IMAGE_TAG}" .

echo
echo "🏷 3) イメージにタグを付与"
docker tag "${REPO_NAME}:${IMAGE_TAG}" "${ECR_URI}"

echo
echo "🚀 4) ECR にプッシュ"
docker push "${ECR_URI}"

echo
echo "✅ 完了！イメージが ECR にプッシュされました："
echo "   ${ECR_URI}"
