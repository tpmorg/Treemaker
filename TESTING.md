# Testing Guide for TreeMaker

This document provides information on how to run tests for the TreeMaker application.

## Setup

The project uses [Vitest](https://vitest.dev/) as the testing framework. All test dependencies are already installed in the project.

## Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode (tests will re-run when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suites
npm run test:relationships    # Run only relationship API tests
npm run test:family-relations # Run only family relations API tests
```

## Test Structure

The tests are organized by feature:

- `src/routes/api/relationships/+server.test.ts` - Tests for the relationships API
- `src/routes/api/family-relations/+server.test.ts` - Tests for the family relations API

## Test Database

Tests use an in-memory SQLite database that is created and seeded for each test. The database schema is defined in `src/test/setup.ts`.

## Adding New Tests

When adding new tests:

1. Create a new test file with the `.test.ts` extension
2. Import the necessary test utilities from `src/test/utils.ts`
3. Use the `prisma` client from `src/test/setup.ts` for database operations

## Mocking

The test setup includes utilities for mocking SvelteKit request events and creating JSON requests. See `src/test/utils.ts` for more details.

## Continuous Integration

Tests are automatically run on GitHub Actions when code is pushed to the repository. The workflow configuration is in `.github/workflows/test.yml`.
