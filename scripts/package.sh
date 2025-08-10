#!/bin/bash

# Package script for ReplyMate Chrome Extension
set -e

echo "📦 Starting ReplyMate packaging process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist directory not found. Run build first.${NC}"
    exit 1
fi

# Get version from manifest
VERSION=$(node -p "require('./dist/manifest.json').version")
PACKAGE_NAME="ReplyMate-v${VERSION}"

echo -e "${YELLOW}📦 Packaging version: ${VERSION}${NC}"

# Create packages directory
mkdir -p packages

# Create ZIP package for Chrome Web Store
echo -e "${YELLOW}🗜️  Creating ZIP package...${NC}"
cd dist
zip -r "../packages/${PACKAGE_NAME}.zip" . -x "*.DS_Store" "*.map"
cd ..

# Create development ZIP (includes source maps if they exist)
echo -e "${YELLOW}🛠️  Creating development package...${NC}"
cd dist
zip -r "../packages/${PACKAGE_NAME}-dev.zip" .
cd ..

# Verify packages
echo -e "${YELLOW}✅ Verifying packages...${NC}"
if [ -f "packages/${PACKAGE_NAME}.zip" ]; then
    SIZE=$(du -h "packages/${PACKAGE_NAME}.zip" | cut -f1)
    echo -e "${GREEN}✅ Production package created: ${PACKAGE_NAME}.zip (${SIZE})${NC}"
else
    echo -e "${RED}❌ Failed to create production package${NC}"
    exit 1
fi

if [ -f "packages/${PACKAGE_NAME}-dev.zip" ]; then
    SIZE=$(du -h "packages/${PACKAGE_NAME}-dev.zip" | cut -f1)
    echo -e "${GREEN}✅ Development package created: ${PACKAGE_NAME}-dev.zip (${SIZE})${NC}"
fi

# Generate package manifest
echo -e "${YELLOW}📋 Generating package manifest...${NC}"
cat > "packages/manifest.json" << EOF
{
  "name": "ReplyMate",
  "version": "${VERSION}",
  "packages": {
    "production": "${PACKAGE_NAME}.zip",
    "development": "${PACKAGE_NAME}-dev.zip"
  },
  "built_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF

echo -e "${GREEN}✅ Packaging completed successfully!${NC}"
echo -e "${GREEN}📁 Packages output: ./packages/${NC}"
echo ""
echo -e "${YELLOW}📊 Package Summary:${NC}"
ls -la packages/
