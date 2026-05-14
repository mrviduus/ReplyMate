#!/bin/bash

# Build script for ReplyMate Chrome Extension
set -e

echo "🚀 Starting ReplyMate build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required commands exist
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}" >&2; exit 1; }
command -v tsc >/dev/null 2>&1 || { echo -e "${RED}❌ TypeScript compiler is required but not installed.${NC}" >&2; exit 1; }

# Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
rm -rf dist/
mkdir -p dist/

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci
fi

# Run type checking
echo -e "${YELLOW}🔍 Running type checks...${NC}"
npm run type-check

# Run linting
echo -e "${YELLOW}🧹 Running linter...${NC}"
npm run lint

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm run test:ci

# Compile TypeScript
echo -e "${YELLOW}⚙️  Compiling TypeScript...${NC}"
npx tsc --project tsconfig.json

# Copy static files
echo -e "${YELLOW}📋 Copying static files...${NC}"
cp src/manifest.json dist/
cp src/popup.html dist/
cp src/popup.css dist/
cp src/linkedin-styles.css dist/
cp -r src/icons dist/

# Validate manifest
echo -e "${YELLOW}✅ Validating manifest...${NC}"
node -e "
const manifest = require('./dist/manifest.json');
if (!manifest.name || !manifest.version || !manifest.manifest_version) {
  console.error('❌ Invalid manifest.json');
  process.exit(1);
}
console.log('✅ Manifest is valid');
console.log('📦 Extension:', manifest.name, 'v' + manifest.version);
"

# Check file sizes
echo -e "${YELLOW}📊 Checking build sizes...${NC}"
du -sh dist/*

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${GREEN}📁 Build output: ./dist/${NC}"

# Optional: Create a simple size report
echo -e "\n${YELLOW}📊 Build Size Report:${NC}"
find dist -type f -name "*.js" -exec du -h {} \; | sort -hr
echo ""
