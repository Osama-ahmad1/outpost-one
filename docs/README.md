# OUTPOST ONE documentation

This guide describes the **existing code**, not a proposed redesign. It is for beginners, teammates and hackathon reviewers. Game numbers are simulation values.

## Read in order

1. [Overview](01-overview.md)
2. [Use cases](02-use-cases.md)
3. [UML and flow diagrams](03-uml.md)
4. [Architecture, saves and deployment](04-architecture.md)
5. [Game logic and balance tables](05-game-logic.md)
6. [Science and NASA sources](06-science-and-sources.md)
7. [Testing](07-testing.md)
8. [AI usage and team contributions](08-ai-usage.md)
9. [Limitations and roadmap](09-limitations-and-roadmap.md)

## Run locally

Requirements: Node.js and pnpm. The project uses a pnpm workspace. The inspected files do not declare one mandatory Node.js version.

From the repository root:

```bash
pnpm install
PORT=25174 BASE_PATH=/ pnpm --filter @workspace/lunar-survival run dev
```

Open the address printed by Vite. In this workspace, use the existing game preview. If port 25174 is already occupied by that workflow, use its preview rather than starting a second copy. For a separate local checkout, an unused port can be substituted.

`PORT` and `BASE_PATH` are required by the Vite configuration, including during builds. No NASA key, account, database or API server is required for this game's current simulation.

```bash
pnpm --filter @workspace/lunar-survival test
pnpm --filter @workspace/lunar-survival run test:source-links
pnpm --filter @workspace/lunar-survival run typecheck
NODE_ENV=production PORT=25174 BASE_PATH=/ pnpm --filter @workspace/lunar-survival run build
```

These are instructions, not a claim that checks were rerun for this documentation-only change. See [Testing](07-testing.md).

## Scope and evidence

Primary evidence is in `artifacts/lunar-survival/src`, its package scripts, Vite configuration and source-checking scripts. All paths in this guide are relative to the repository root unless noted otherwise.

No game code, tests, configuration or save data were changed to produce this guide. Mermaid blocks are text diagrams; use a Markdown viewer with Mermaid support.
