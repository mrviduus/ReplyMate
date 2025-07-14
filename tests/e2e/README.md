# E2E Testing Documentation

## Overview
This directory contains end-to-end tests for the ReplyMate LinkedIn extension using Cypress.

## Test Structure
- `li-comment.cy.ts` - Main test file for LinkedIn comment AI generation flow
- `support/` - Custom commands and configuration
- `tsconfig.json` - TypeScript configuration for Cypress

## Running Tests

### Prerequisites
1. Build the extension: `npm run build`
2. Load the extension in Chrome for manual testing
3. Have LinkedIn login credentials ready

### Commands
- `npm run cy:open` - Open Cypress UI for interactive testing
- `npm run cy:run` - Run tests in headless mode

## Test Scenarios
1. **AI Comment Generation**: Tests the core ✨ AI button functionality
2. **Authentication Handling**: Tests LinkedIn login requirements
3. **Rate Limiting**: Tests extension behavior under rate limits
4. **Multiple Comment Boxes**: Tests handling of multiple posts

## Notes
- Tests use stubbed LinkedIn authentication cookies
- Extension needs to be manually loaded in Chrome for full e2e testing
- Tests are designed to run against LinkedIn's staging/production environment
