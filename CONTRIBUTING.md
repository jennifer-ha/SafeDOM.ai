# Contributing to SafeDOM.ai

Thanks for helping make SafeDOM.ai safer and better for everyone.

## Getting started

1. Fork the repository on GitHub.
2. Clone your fork and install dependencies:
   ```bash
   npm install
   ```
3. Run the test suite to confirm everything works locally:
   ```bash
   npm test
   ```
4. For lint checks:
   ```bash
   npm run lint
   ```

## Development tips

- The project uses modern TypeScript with `strict` mode enabled. Please keep typings accurate.
- Avoid adding heavy dependencies. Privacy-by-design means a small, auditable surface area.
- Prefer pure functions and keep side effects (especially network or storage) out of the library.
- Add meaningful tests alongside new features or fixes. Vitest is configured with a JSDOM environment.
- When adding or modifying redaction patterns, include rationale in code comments and tests that cover realistic examples.
- Demo site contributions are welcome—improve UI clarity, add scenarios, or accessibility.

## Pull request checklist

- [ ] Tests added or updated.
- [ ] Linting passes.
- [ ] Public API changes are documented in `README.md`.
- [ ] No sensitive data or secrets added to code or tests.

## Reporting bugs and proposing features

- Open an issue describing the problem or idea, ideally with a minimal reproduction.
- For security-related issues, please follow the instructions in `SECURITY.md` rather than filing a public issue.

## Code style

- Use the provided ESLint configuration (`npm run lint`).
- Keep comments focused on intent, not restating the code.
- Default to ASCII text; avoid unnecessary Unicode in source files.

## Working on the demo site

```bash
cd examples/demo-site
npm install
npm run dev
```

The demo shows SafeDOM.ai annotations and redactions; keep sample data fictional and avoid real PII.

## Licensing

By contributing, you agree that your contributions will be licensed under the MIT License included in this repository.
