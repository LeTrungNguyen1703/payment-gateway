# Testing Instructions

## Overview
This document provides guidelines and best practices for writing unit tests in the ExpenseNest project using Jest and NestJS testing utilities.

## Table of Contents
1. [General Testing Principles](#general-testing-principles)
2. [Unit Test Structure](#unit-test-structure)
3. [Mocking Strategies](#mocking-strategies)
4. [Auto-Mocking](#auto-mocking)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Running Tests](#running-tests)

---

## General Testing Principles

### Test Coverage Goals
- Aim for **80%+** code coverage for services
- Test all public methods
- Cover both happy paths and error scenarios
- Test edge cases and boundary conditions

### Test Independence
- Each test should be independent and isolated
- Tests should not depend on the execution order
- Use `beforeEach` to reset mocks and state

### Test Naming Convention
```typescript
it('should [expected behavior] when [condition]', async () => {
  // Test implementation
});
```

Examples:
- `it('should create a user successfully', async () => {})`
- `it('should throw NotFoundException when user not found', async () => {})`
- `it('should return empty array when no data exists', async () => {})`

---

## Unit Test Structure

### Basic Test File Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { DependencyService } from '../dependency/dependency.service';

describe('YourService', () => {
  let service: YourService;
  let dependencyService: DependencyService;

  const mockDependencyService = {
    method1: jest.fn(),
    method2: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: DependencyService,
          useValue: mockDependencyService,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
    dependencyService = module.get<DependencyService>(DependencyService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should test something', async () => {
      // Arrange
      const input = { /* test data */ };
      mockDependencyService.method1.mockResolvedValue({ /* mock response */ });

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual({ /* expected result */ });
      expect(mockDependencyService.method1).toHaveBeenCalledWith(/* expected args */);
    });
  });
});
```

---

## Mocking Strategies

### 1. Manual Mocking (Recommended for Most Cases)

Use manual mocking when you have a few dependencies and want full control over mock behavior.

**Example: Mocking PrismaService**
```typescript
const mockPrismaService = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UserService,
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
    ],
  }).compile();
});
```

### 2. Partial Mocking

When you only need to mock specific methods:

```typescript
const mockService = {
  importantMethod: jest.fn(),
  anotherMethod: jest.fn(),
} as any;
```

### 3. Mocking with jest.spyOn

For spying on existing methods:

```typescript
it('should call internal method', () => {
  const spy = jest.spyOn(service as any, 'privateMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
```

---

## Auto-Mocking

### When to Use Auto-Mocking

Use auto-mocking when:
- ✅ You have **many dependencies** (5+ services)
- ✅ Most dependencies are **not relevant** to the test
- ✅ You want to **quickly** set up test infrastructure
- ✅ You're testing a **specific method** that only uses 1-2 dependencies

### How to Implement Auto-Mocking

**Method 1: Using jest.mock()**

```typescript
// At the top of your test file
jest.mock('../dependency/dependency.service');
jest.mock('../another/another.service');

import { DependencyService } from '../dependency/dependency.service';
import { AnotherService } from '../another/another.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        DependencyService,
        AnotherService,
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should work with auto-mocked dependencies', async () => {
    // Mock specific methods you need
    (DependencyService.prototype.someMethod as jest.Mock).mockResolvedValue('result');
    
    const result = await service.yourMethod();
    
    expect(result).toBeDefined();
  });
});
```

**Method 2: Using ModuleMocker**

```typescript
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    })
      .useMocker((token) => {
        // Don't mock the service being tested
        if (token === YourService) {
          return;
        }

        // Auto-mock everything else
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token,
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    service = module.get<YourService>(YourService);
  });

  it('should work with auto-mocked dependencies', async () => {
    const result = await service.yourMethod();
    expect(result).toBeDefined();
  });
});
```

**Method 3: Custom Mock Factory**

```typescript
function createMockProvider(token: any) {
  return {
    provide: token,
    useValue: {
      // Add common methods that might be called
      findOne: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      YourService,
      createMockProvider(Service1),
      createMockProvider(Service2),
      createMockProvider(Service3),
    ],
  }).compile();
});
```

---

## Best Practices

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should create a user', async () => {
  // Arrange: Set up test data and mocks
  const createDto = { name: 'John', email: 'john@example.com' };
  mockPrismaService.user.create.mockResolvedValue({ id: 1, ...createDto });

  // Act: Execute the method being tested
  const result = await service.create(createDto);

  // Assert: Verify the results
  expect(result).toEqual({ id: 1, ...createDto });
  expect(mockPrismaService.user.create).toHaveBeenCalledWith({
    data: createDto,
  });
});
```

### 2. Test Error Scenarios

```typescript
it('should throw NotFoundException when user not found', async () => {
  mockPrismaService.user.findUnique.mockResolvedValue(null);

  await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  await expect(service.findOne(999)).rejects.toThrow('User with ID 999 not found');
});
```

### 3. Test Database Errors

```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

it('should handle Prisma foreign key constraint error', async () => {
  const error = new PrismaClientKnownRequestError('Foreign key constraint failed', {
    code: 'P2003',
    clientVersion: '5.0.0',
  });
  mockPrismaService.user.create.mockRejectedValue(error);

  await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
});
```

### 4. Test Async Operations

```typescript
it('should handle async operations', async () => {
  mockService.asyncMethod.mockResolvedValue('result');
  
  const result = await service.methodUnderTest();
  
  expect(result).toBe('expected');
});
```

### 5. Use describe Blocks for Organization

```typescript
describe('YourService', () => {
  describe('create', () => {
    it('should create successfully', () => {});
    it('should handle validation errors', () => {});
    it('should handle duplicate entries', () => {});
  });

  describe('findOne', () => {
    it('should find by id', () => {});
    it('should throw when not found', () => {});
  });

  describe('update', () => {
    it('should update successfully', () => {});
    it('should verify ownership', () => {});
  });
});
```

---

## Common Patterns

### Testing with Transactions

```typescript
it('should execute in transaction', async () => {
  mockPrismaService.$transaction.mockImplementation(async (callback) => {
    return callback({
      user: mockPrismaService.user,
      expense: mockPrismaService.expense,
    });
  });

  const result = await service.methodWithTransaction();

  expect(mockPrismaService.$transaction).toHaveBeenCalled();
});
```

### Testing Private Methods (If Necessary)

```typescript
it('should test private method through public interface', async () => {
  // Access private method (use sparingly)
  const result = await (service as any).privateMethod();
  expect(result).toBeDefined();
});
```

### Testing Date Calculations

```typescript
it('should calculate dates correctly', () => {
  const startDate = new Date('2025-01-01');
  mockService.getCurrentDate.mockReturnValue(startDate);

  const result = service.calculateEndDate(startDate, 30);

  expect(result.getDate()).toBe(31);
});
```

### Testing Enum Values

```typescript
it('should handle different transaction types', async () => {
  const types = [transaction_type_enum.INCOME, transaction_type_enum.EXPENSE];

  for (const type of types) {
    mockPrismaService.transaction.findMany.mockResolvedValue([{ type }]);
    const result = await service.findByType(type);
    expect(result[0].type).toBe(type);
  }
});
```

### Mock Reset Strategies

```typescript
beforeEach(() => {
  // Clear call history but keep mock implementations
  jest.clearAllMocks();
});

afterEach(() => {
  // Reset mock implementations and call history
  jest.resetAllMocks();
});

afterAll(() => {
  // Restore original implementations
  jest.restoreAllMocks();
});
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- your.service.spec.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests for Specific Pattern
```bash
npm test -- --testNamePattern="should create"
```

### Run Tests for Specific Suite
```bash
npm test -- --testPathPattern=recurring-transactions
```

---

## Example: Complete Test File

See `src/recurring-transactions/recurring-transactions.service.spec.ts` for a comprehensive example that demonstrates:
- ✅ Proper test structure
- ✅ Mocking PrismaService
- ✅ Testing CRUD operations
- ✅ Error handling
- ✅ Transaction testing
- ✅ Date calculations
- ✅ Edge cases

**Key Takeaways from the Example:**
1. Mock only what you need
2. Group related tests using `describe`
3. Clear mocks between tests
4. Test both success and failure scenarios
5. Verify method calls with correct arguments
6. Use `expect.objectContaining()` for partial matches
7. Use `expect.any(Date)` for dynamic values

---

## Common Issues and Solutions

### Issue: Mock not being called
**Solution:** Ensure mock is properly set up before the method call
```typescript
mockService.method.mockResolvedValue(value); // Set BEFORE calling
await service.methodUnderTest();
```

### Issue: Prisma client errors in tests
**Solution:** Mock Prisma errors properly
```typescript
const error = new PrismaClientKnownRequestError('message', {
  code: 'P2025',
  clientVersion: '5.0.0',
});
```

### Issue: Date comparison failures
**Solution:** Use `expect.any(Date)` or normalize dates
```typescript
expect(result.createdAt).toEqual(expect.any(Date));
// OR
expect(result.createdAt.toISOString()).toBe(expectedDate.toISOString());
```

### Issue: Too many dependencies to mock
**Solution:** Use auto-mocking (see [Auto-Mocking](#auto-mocking) section)

---

## Checklist for Writing Tests

- [ ] Test file follows naming convention: `*.spec.ts`
- [ ] All dependencies are properly mocked
- [ ] `beforeEach` clears mocks
- [ ] Service is defined test exists
- [ ] All public methods have tests
- [ ] Happy path is tested
- [ ] Error scenarios are tested
- [ ] Edge cases are covered
- [ ] Mocks are verified with correct arguments
- [ ] Tests are independent and isolated
- [ ] Test names are descriptive
- [ ] AAA pattern is followed

---

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Mocking Guide](https://jestjs.io/docs/mock-functions)

---

*Last Updated: October 14, 2025*

