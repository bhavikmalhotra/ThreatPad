# Contributing to ThreatPad

Thank you for your interest in contributing to ThreatPad!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ThreatPad.git`
3. Install dependencies: `pnpm install`
4. Copy `.env.example` to `.env` and adjust values
5. Start infrastructure: `docker compose up -d`
6. Push database schema: `pnpm --filter @threatpad/db push`
7. Seed demo data: `pnpm --filter @threatpad/db seed`
8. Start development: `pnpm dev`

## Development Workflow

- Create a feature branch from `main`
- Make your changes with clear, focused commits
- Ensure `pnpm lint` passes
- Ensure `pnpm build` succeeds
- Open a pull request with a description of your changes

## Project Structure

```
threatpad/
├── apps/web/        # Next.js 15 frontend
├── apps/server/     # Fastify 5 backend
├── packages/shared/ # Shared types, validators, utilities
└── packages/db/     # Drizzle ORM schema and migrations
```

## Code Style

- TypeScript strict mode throughout
- Tailwind CSS for styling (dark mode default)
- shadcn/ui component pattern (Radix UI primitives)
- Zod for runtime validation
- Keep changes minimal and focused

## Reporting Issues

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser and OS information
