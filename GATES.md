# Gates: EventMatch MVP

OWNS: app/**, components/**, data/**, docs/**, lib/**, public/**, scripts/**, tests/**, .github/**, AGENTS.md, GATES.md, README.md, package.json, package-lock.json, next.config.ts, playwright.config.ts, tsconfig.json, vitest.config.ts, eslint.config.mjs, .env.example, .gitignore

Scope: deliver a production-buildable EventMatch MVP backed by the supplied CSV, deterministic recommendations, optional safe AI explanations, documented operation, and automated verification.

- [ ] G1: the immutable dataset copy parses and passes schema, uniqueness, list, flag, number, and calendar validation
  CHECK: npm run verify:dataset
  EXPECT: dataset verification passed
  EVIDENCE: pending

- [ ] G2: domain and AI-safety behavior, including all A-H reference scenarios, passes automated tests
  CHECK: npm test -- --run
  EXPECT: Test Files
  EVIDENCE: pending

- [ ] G3: lint, strict type checking, and the production build all succeed without an OpenAI key
  CHECK: npm run verify:quality
  EXPECT: quality verification passed
  EVIDENCE: pending

- [ ] G4: browser tests exercise form submission, repeated searches, date changes, sparse results, empty results, and profile flags
  CHECK: npm run test:e2e
  EXPECT: passed
  EVIDENCE: pending

- [ ] G5: Russian README documents the implemented system, actual checks, dataset version, demo scenarios, deployment, limits, and development log
  CHECK: npm run verify:docs
  EXPECT: documentation verification passed
  EVIDENCE: pending

- [ ] G6: the responsive interface is manually checked at desktop and 375px width, with keyboard focus and reduced-motion behavior
  EVIDENCE: pending
