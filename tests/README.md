# Test Configuration and Guidelines

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### Running Specific Tests
```bash
# Run specific test file
npm test content.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should handle"

# Run tests for specific functionality
npm test ui-interactions
```

## Test Structure

### Core Test Suites

1. **Content Script Tests** (`tests/content.test.ts`)
   - Page content extraction
   - Chrome messaging integration
   - Error handling for different page types

2. **Popup Utility Tests** (`tests/popup-utils.test.ts`)
   - Core utility functions
   - DOM manipulation helpers
   - Input validation and processing

3. **UI Interaction Tests** (`tests/ui-interactions.test.ts`)
   - User interface interactions
   - Event handling
   - Form validation and submission
   - Loading states and feedback

4. **Chrome API Integration Tests** (`tests/chrome-api.test.ts`)
   - Extension API usage
   - Tab management
   - Storage operations
   - Security and permissions

5. **Performance & Error Handling** (`tests/performance-error.test.ts`)
   - Memory management
   - Error scenarios
   - Performance optimization
   - Resource management

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Mocking Strategy

### Chrome APIs
All Chrome extension APIs are mocked in `tests/setup.ts`:
- `chrome.runtime.*`
- `chrome.tabs.*`
- `chrome.storage.*`

### External Dependencies
- **@mlc-ai/web-llm**: Mocked for isolation
- **progressbar.js**: Mocked UI component
- **navigator.clipboard**: Mocked for testing copy functionality

## Test Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` for setup
- Clean up after tests

### 2. Meaningful Assertions
- Test behavior, not implementation
- Use descriptive test names
- Include edge cases

### 3. Error Testing
- Test error conditions
- Verify error handling
- Check graceful degradation

### 4. Performance Testing
- Test with large data sets
- Verify memory cleanup
- Check response times

## Continuous Integration

Tests are configured to run in CI environments with:
- No watch mode
- Coverage reporting
- Optimized for automation

## Debugging Tests

### Common Issues
1. **DOM not available**: Ensure `jsdom` environment
2. **Chrome APIs undefined**: Check mocks in setup
3. **Async test failures**: Use proper async/await or done callbacks
4. **Module import errors**: Verify Jest configuration

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="specific test name" --verbose

# Run single test file with debugging
node --inspect-brk node_modules/.bin/jest tests/content.test.ts --runInBand
```
