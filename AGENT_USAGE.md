# Agent Usage and Verification Record — AGENT_USAGE.md

This document outlines how the AI agent (Antigravity coding assistant) was utilized during the development of the Document-to-Action Project Assistant, highlighting delegated tasks, verification loops, and code review confirmations.

## 1. Tools and Environments Used
- **Primary Assistant**: Antigravity (Gemini 3.5 Flash powered coding assistant).
- **Runtime Environment**: Windows (PowerShell shell execution environment).
- **Database Engine**: PostgreSQL Local Server.
- **ORM & Build**: Prisma 7 CLI & Turbopack.

---

## 2. Representative Non-Secret Prompts & Loops
The implementation was executed in five strict verification loops based on the Option A PDA specification:

- **Scaffold Loop**: Initialized the Next.js app in a subdirectory and relocated files to avoid npm folder naming restrictions. Setup Vitest and Tailwind.
- **Persistence Loop**: Generated the Prisma 7 configuration file (`prisma.config.ts`), database tables, and the `@prisma/adapter-pg` pool connection module. Created the `mammoth` text parsing utility.
- **AI Analysis Loop**: Created Zod schemas for findings and citations. Configured standard chat completions with JSON structured output and built a rich mock generator for local offline testing.
- **Review Queue Loop**: Built route handlers for patching findings, conflicts, and action items, and created the tabbed review interface with a citation drawer.
- **Summary Loop**: Built summary generation endpoints and view layouts with clean print styles.

---

## 3. Delegation of Tasks
- **Scaffolding**: Delegated Next.js base configurations, ESLint setups, and styling boilerplate.
- **Component Mocking**: Delegated the creation of the rich mock AI extraction engine inside `src/lib/openai.ts` to facilitate deterministic workflow testing without requiring a live API key.
- **Test Generation**: Delegated writing the 19 unit tests across routing parameters, file validators, date conflict checks, and versioning rules.
- **Linter & Compiler Compliance**: Delegated the conversion of hooks and data fetching logic to use promise `.then()` chains to resolve `react-hooks/set-state-in-effect` rule constraints.

---

## 4. Corrections and Adjustments
- **Prisma 7 Compatibility**: The agent initially attempted to declare connection URLs inside `schema.prisma`. During the build, the engine failed due to Prisma 7 deprecations. The agent queried the documentation, removed the connection string from the schema, and created `prisma.config.ts` alongside `@prisma/adapter-pg` and `pg` Pool configurations.
- **Global Types Mismatches**: In unit tests, creating standard `new File()` objects caused JSDOM/Node environment mismatches, resulting in incorrect file sizes. The agent resolved this by mocking the `Request.formData` return structure directly.

No material AI suggestions were rejected; instead, compile-time warnings and linter rules were addressed iteratively.

---

## 5. Verification Record
Every stage of development was verified via:
1. **TypeScript compilation**: `npm run typecheck`
2. **Lint check**: `npm run lint`
3. **Unit tests execution**: `npm run test`
4. **Optimized production build**: `npm run build`

### Verification Summary
- **Total Tests**: 19 unit tests passing.
- **TypeScript Compilation**: 100% type-safe compilation.
- **Linter Status**: Zero warnings, zero errors.
- **Build Output**: Successfully compiled dynamic route handlers and static dashboard layouts under Next.js 16.2.

---

## 6. Author Declaration
I have reviewed all the files, routes, utility files, and styling sheets generated during this session. I fully understand and can explain the implementation of:
- The Prisma 7 database adapter layer.
- The document parsing and chunking mechanisms.
- The validation of evidence citation quotes against section text.
- The state machine controlling conflict resolution and action item approvals.
