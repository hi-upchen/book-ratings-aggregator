# ContentRouter Test Suite

This directory contains comprehensive test cases for the `ContentRouter` utility class, which is responsible for routing Chrome extension content scripts to appropriate retailer handlers.

## Test Coverage

The test suite covers the following functionality:

### 1. Handler Registration
- ✅ Single handler registration
- ✅ Multiple handler registration
- ✅ Duplicate handler name prevention
- ✅ Handler name uniqueness validation

### 2. Handler Management
- ✅ Handler unregistration by name
- ✅ All handlers clearing
- ✅ Handler count tracking
- ✅ Registered handler name listing

### 3. URL Routing
- ✅ Route to matching handler using current location
- ✅ Route to matching handler using provided URL
- ✅ First-match routing when multiple handlers match
- ✅ No-match handling and logging
- ✅ Empty router handling

### 4. Retailer-Specific URL Matching
- ✅ Kobo URL patterns (`kobo.com/*`)
- ✅ PChome URL patterns (`pchome.com.tw/*`)
- ✅ Bokelai URL patterns (`books.com.tw/*`)

### 5. Error Handling
- ✅ Handler execution errors
- ✅ Invalid matches function errors
- ✅ Edge case scenarios

### 6. Integration Testing
- ✅ Complete workflow testing
- ✅ Real-world usage scenarios

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Each test file follows the pattern:
- **Setup**: Mock objects and test handlers
- **Test Groups**: Organized by functionality
- **Assertions**: Comprehensive validation of expected behavior
- **Cleanup**: Proper mock resetting between tests

## Mock Objects

The tests use several mock objects:
- `TestKoboHandler`, `TestPChomeHandler`, `TestBokelaiHandler`: Mock retailer handlers
- `mockLocation`: Global location object mock
- `mockConsoleLog`: Console logging mock for output verification
- `mockDocument`: Document object mock

## Test Utilities

- **Jest**: Testing framework
- **TypeScript**: Type-safe test development
- **JSDOM**: DOM environment simulation
- **Coverage Reports**: Code coverage analysis

## Best Practices

The tests follow these best practices:
- ✅ Isolated test cases with proper setup/teardown
- ✅ Comprehensive edge case testing
- ✅ Mock object usage for external dependencies
- ✅ Clear test descriptions and organization
- ✅ Type safety with TypeScript
- ✅ Integration testing for real-world scenarios