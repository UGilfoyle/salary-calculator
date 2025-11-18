# Testing Guide

This project includes comprehensive unit and end-to-end (E2E) testing for both frontend and backend.

## Frontend Testing

### Unit Tests (Vitest)

**Run all tests:**
```bash
cd frontend
npm run test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run tests with UI:**
```bash
npm run test:ui
```

**Generate coverage report:**
```bash
npm run test:coverage
```

**Test files location:**
- Unit tests: `frontend/src/**/*.test.tsx` or `*.spec.tsx`
- Test setup: `frontend/src/test/setup.ts`

### E2E Tests (Playwright)

**Run E2E tests:**
```bash
cd frontend
npm run test:e2e
```

**Run E2E tests with UI:**
```bash
npm run test:e2e:ui
```

**Test files location:**
- E2E tests: `frontend/e2e/*.spec.ts`

**Supported browsers:**
- Chromium (Desktop Chrome)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Backend Testing

### Unit Tests (Jest)

**Run all tests:**
```bash
cd backend
npm run test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Generate coverage report:**
```bash
npm run test:cov
```

**Test files location:**
- Unit tests: `backend/src/**/*.spec.ts`

### E2E Tests (Jest + Supertest)

**Run E2E tests:**
```bash
cd backend
npm run test:e2e
```

**Test files location:**
- E2E tests: `backend/test/*.e2e-spec.ts`

## Writing Tests

### Frontend Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Frontend E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to salary calculator', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Salary Calculator');
  await expect(page).toHaveURL(/.*salary/);
});
```

### Backend Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Backend E2E Test Example

```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('API (e2e)', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/endpoint')
      .expect(200);
  });
});
```

## Coverage Goals

- **Unit Tests**: Aim for 80%+ coverage
- **E2E Tests**: Cover critical user flows
- **Key Areas to Test**:
  - Salary calculation logic
  - Authentication flows
  - ATS checker functionality
  - Payment processing
  - API endpoints

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Frontend Tests
  run: |
    cd frontend
    npm run test
    npm run test:e2e

- name: Run Backend Tests
  run: |
    cd backend
    npm run test
    npm run test:e2e
```

