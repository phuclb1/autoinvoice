---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
feature: vnpt-invoice-desktop-app
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- **Unit test coverage target**: 80% for Rust backend services
- **Integration test scope**: Critical paths (Excel parsing, download flow, database operations)
- **End-to-end test scenarios**: Full download workflow with mocked external services
- **Alignment**: All acceptance criteria from requirements must have corresponding tests

## Unit Tests
**What individual components need testing?**

### Excel Parser Module
- [ ] Test case 1: Parse valid Excel file with standard VNPT format
- [ ] Test case 2: Parse Excel file with "MÃ TRA CỨU" in different row positions
- [ ] Test case 3: Handle Excel file without "MÃ TRA CỨU" column (error case)
- [ ] Test case 4: Filter out invalid invoice codes (no C or _ pattern)
- [ ] Test case 5: Handle empty Excel file
- [ ] Test case 6: Handle corrupt/invalid Excel file

### Captcha Solver Module
- [ ] Test case 1: Successful captcha solve with mocked OpenAI response
- [ ] Test case 2: Handle OpenAI API error (network failure)
- [ ] Test case 3: Handle invalid API key
- [ ] Test case 4: Handle rate limit response
- [ ] Test case 5: Parse different response formats

### Database Module
- [ ] Test case 1: Create tables on first run
- [ ] Test case 2: Save and retrieve settings
- [ ] Test case 3: Create download batch and get batch by ID
- [ ] Test case 4: Create invoice records with batch_id
- [ ] Test case 5: Update invoice status
- [ ] Test case 6: Update batch counts (success, failed)
- [ ] Test case 7: Query batches with pagination

### Download Orchestrator
- [ ] Test case 1: Successful download single invoice
- [ ] Test case 2: Retry on captcha failure (up to 3 times)
- [ ] Test case 3: Request manual captcha after 3 failures
- [ ] Test case 4: Handle download cancellation
- [ ] Test case 5: Progress event emission at correct intervals

## Integration Tests
**How do we test component interactions?**

### Excel to Invoice Preview Flow
- [ ] Upload Excel → Parse → Display preview with correct invoice count
- [ ] Verify invoice codes match source Excel file
- [ ] Handle file upload cancellation

### Download Workflow Integration
- [ ] Start download → Progress updates → Log entries → Completion
- [ ] Database records created and updated correctly during download
- [ ] Cancel mid-download → Correct status in database

### Settings Persistence
- [ ] Save settings → Close app → Reopen → Settings loaded correctly
- [ ] Update API key → New downloads use updated key

### History Integration
- [ ] Complete download batch → Appears in history list
- [ ] View batch details → Shows all invoices with correct status
- [ ] Retry failed invoices → Creates new batch with only failed codes

## End-to-End Tests
**What user flows need validation?**

### E2E Test 1: First-Time User Setup
1. [ ] Open app fresh (no settings)
2. [ ] Navigate to Settings
3. [ ] Enter API key and download directory
4. [ ] Save settings
5. [ ] Verify settings persisted

### E2E Test 2: Standard Download Flow
1. [ ] Upload valid Excel file
2. [ ] Verify preview shows correct invoice count
3. [ ] Click "Process" to start download
4. [ ] Verify progress bar updates
5. [ ] Verify log shows each invoice status
6. [ ] Verify PDFs downloaded to correct directory
7. [ ] Verify history updated

### E2E Test 3: Manual Captcha Flow
1. [ ] Start download with intentionally failing captcha (mock)
2. [ ] Verify captcha modal appears after 3 failures
3. [ ] Enter manual captcha
4. [ ] Verify download continues

### E2E Test 4: Error Recovery
1. [ ] Start download
2. [ ] Simulate network failure mid-download
3. [ ] Verify appropriate error message
4. [ ] Verify partial progress saved
5. [ ] Can retry failed invoices

## Test Data
**What data do we use for testing?**

### Test Fixtures

```
tests/fixtures/
├── valid_invoice_list.xlsx      # Standard VNPT format, 10 invoice codes
├── large_invoice_list.xlsx      # 100 invoice codes for performance testing
├── no_header.xlsx               # Missing "MÃ TRA CỨU" column
├── empty.xlsx                   # Empty Excel file
├── mixed_format.xlsx            # Some valid, some invalid codes
└── sample_captcha.png           # Sample captcha image for solver tests
```

### Mock Data

```typescript
// Mock invoice codes
const mockInvoiceCodes = [
  'C25TLK0019654_Ln',
  'C25TLK0019655_Ln',
  'C25TLK0019656_Ln',
];

// Mock OpenAI response
const mockCaptchaResponse = {
  choices: [{
    message: {
      content: 'AB12'
    }
  }]
};

// Mock settings
const mockSettings = {
  openaiApiKey: 'sk-test-key',
  defaultDownloadDir: '/Users/test/Downloads',
  vnptUrl: 'https://test.vnpt-invoice.com.vn',
};
```

### Test Database Setup
- Use in-memory SQLite for unit tests
- Create fresh database file for integration tests
- Clean up after each test run

## Test Reporting & Coverage
**How do we verify and communicate test results?**

### Rust Tests
```bash
# Run all tests with coverage
cargo tarpaulin --out Html --output-dir coverage/

# Run specific test module
cargo test services::excel_parser --nocapture
```

### Frontend Tests
```bash
# Run tests with coverage
pnpm test -- --coverage

# Generate coverage report
pnpm test:coverage
```

### Coverage Thresholds
- Backend (Rust): 80% line coverage minimum
- Frontend (TypeScript): 70% line coverage minimum
- Critical paths: 100% branch coverage

### Coverage Gaps (Document when found)
- External service calls (OpenAI, VNPT) - mocked in tests
- Platform-specific code (macOS vs Windows paths)
- Browser automation edge cases

## Manual Testing
**What requires human validation?**

### UI/UX Testing Checklist
- [ ] Upload area shows drag-and-drop visual feedback
- [ ] Progress bar animation is smooth
- [ ] Log viewer auto-scrolls correctly
- [ ] Captcha modal is readable and responsive
- [ ] Error messages are clear and actionable
- [ ] Loading states are visible and don't flicker
- [ ] All buttons have appropriate disabled states

### Cross-Platform Testing
| Feature | macOS | Windows |
|---------|-------|---------|
| File dialog opens correctly | [ ] | [ ] |
| Downloads save to correct path | [ ] | [ ] |
| App starts without errors | [ ] | [ ] |
| SQLite database creates | [ ] | [ ] |
| Browser automation works | [ ] | [ ] |

### Accessibility
- [ ] Keyboard navigation works for all interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible (labels, aria attributes)

## Performance Testing
**How do we validate performance?**

### Benchmarks

| Scenario | Target | How to Test |
|----------|--------|-------------|
| App startup (cold) | < 3s | Time from click to UI ready |
| App startup (warm) | < 1s | Subsequent launches |
| Excel parse (100 rows) | < 1s | `cargo bench excel_parser` |
| Excel parse (1000 rows) | < 5s | `cargo bench excel_parser` |
| Single invoice download | < 30s | Manual timing |
| Memory (idle) | < 100MB | Activity Monitor/Task Manager |
| Memory (active, 50 invoices) | < 500MB | Monitor during batch download |

### Load Testing
- Download batch of 100 invoices without memory leak
- Monitor CPU usage during download (should stay < 50%)
- Verify log viewer doesn't slow down with 1000+ entries

## Bug Tracking
**How do we manage issues?**

### Issue Template
```markdown
**Bug Title**: [Short description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:

**Actual Behavior**:

**Environment**:
- OS: macOS / Windows
- App Version:
- Error Logs:

**Screenshots** (if applicable):
```

### Severity Levels
- **Critical**: App crashes, data loss, security issue
- **High**: Core feature broken, no workaround
- **Medium**: Feature partially broken, has workaround
- **Low**: Minor UI issues, cosmetic bugs

### Regression Testing
- Run full test suite before each release
- Maintain list of fixed bugs for regression checks
- Automated smoke tests on CI for each PR
