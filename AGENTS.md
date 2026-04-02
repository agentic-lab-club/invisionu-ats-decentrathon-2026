# MonoRepository Guidelines

For additional product, business, and project context, read the root `README.md` first.  
It is the primary high-level source for understanding what we are building and why.

---

## Purpose of This Repository

This repository is an umbrella workspace / monorepo.

Each major top-level product folder should be treated like its own repository, service, or module with its own lifecycle, tooling, and local conventions.

The agent may inspect the whole monorepo for context, dependency tracing, architecture understanding, and implementation reference.  
However, for any single task, the agent should normally make changes only inside one primary module / service / folder unless the user explicitly asks for broader multi-module changes.

**Default principle:**
- read broadly across the monorepo
- understand dependencies carefully
- write narrowly in one target module at a time

---

## Project Structure & Module Organization

This root is an umbrella workspace.  
Each major top-level folder is effectively its own repository-like module.

Before running module-specific commands such as Git operations, builds, tests, or Docker Compose, enter that module’s directory unless the task explicitly targets root-level files.

Main modules:

- `frontend/`: Frontend application.
- `backend/`: Golang core backend service.
- `llm/`: Python LLM scoring service and separate FastAPI web server.
- `tg_bot_rag/KazRAGUNIProject/`: RAG-based university admission AI chatbot for Telegram, built with Python, Aiogram, and RAG-related components.
- `infrastructure/`: Infrastructure and DevOps code, including IaC such as Terraform for AWS and related environment setup.
- `docs/ai-sessions/`: stored AI chat sessions that may provide extended context, prior decisions, reasoning history, or implementation notes.
- other top-level folders not listed above: do not assume they are product modules unless confirmed by their contents.

Important documentation sources of truth:
- root `README.md`
- module-level `README.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- files inside `docs/`

These documentation files should be treated as important guidance and context, especially when they describe architecture, workflows, standards, business logic, or project decisions.

---

## Module Standards

Each main module is expected to have, where applicable:

- its own `README.md`, also `AGENTS.md`
- its own Docker Compose setup
- its own local conventions and commands
- its own dependencies and runtime assumptions

Do not assume that all modules are built, run, tested, or deployed in the same way.

Always inspect the local module files before making changes.

---

## Agentic Coding Rules for This Monorepo

This repository is intended to be worked on by agentic coding tools and LLM coding sessions.

### Default Working Model

For each task, separate the repository into:

1. **Read scope** → the entire monorepo  
2. **Write scope** → one primary target module / service / folder  
3. **Protected shared scope** → cross-module/shared files that must not be modified by default

The agent is encouraged to read any relevant part of the repository in order to:
- understand business context
- understand architecture
- inspect patterns already used elsewhere
- trace dependencies and data flow
- compare implementations
- validate assumptions before editing

But by default, the agent must only modify files inside the single target module relevant to the user’s request.

---

## Read Policy

The agent may read files across the entire repository, including:

- other services and modules
- shared packages
- infrastructure files
- documentation
- Docker and deployment files
- tests
- schemas and contracts
- examples
- AI session notes in `docs/ai-sessions/`

Reading broadly is allowed and encouraged when it improves accuracy.

Cross-module reading should be used to:
- understand existing patterns
- align implementation style
- understand interfaces between modules
- inspect request/response structures
- understand shared dependencies
- avoid duplicating logic that already exists elsewhere

---

## Write Policy

Unless the user explicitly requests otherwise, the agent must modify files only inside one target module / service / folder per task.

Examples:
- `backend/**`
- `frontend/**`
- `llm/**`
- `tg_bot_rag/KazRAGUNIProject/**`
- `infrastructure/**`

The agent must avoid silently expanding a narrow task into a multi-module change.

Do not:
- edit neighboring modules for convenience
- make unrelated cleanup changes
- refactor outside the target module
- perform repo-wide formatting
- update unrelated documentation
- make opportunistic fixes outside the requested scope

Keep diffs focused, minimal, and scoped.

---

## Protected Shared Scope

Some files and directories may affect multiple modules and must be treated as protected by default.

Examples include:
- shared contracts
- shared schemas
- shared DTO/interface definitions
- root-level dependency files
- root-level Docker files
- global CI/CD files
- global infrastructure templates
- generated shared clients
- root workspace configuration

These files may be read freely, but must not be modified unless:
- the user explicitly asks for it, or
- the task clearly requires it and the needed change is first called out explicitly

---

## Shared Contracts Rule

Shared contracts are sensitive and must not be changed by default.

Examples:
- protobuf definitions
- OpenAPI specs
- GraphQL schema
- shared request/response contracts
- event/message schemas
- shared validation schema
- common public interfaces used across modules

Default behavior:
- the agent may inspect and reason about shared contracts
- the agent may identify required contract changes
- the agent must not modify shared contracts automatically unless explicitly requested

If a task depends on shared contract changes, the agent should:
1. keep the main patch limited to the target module if possible
2. identify which shared files would need changes
3. explain why those changes are required
4. avoid applying those shared changes automatically unless explicitly requested

---

## Rules for Parallel Agent Sessions

This monorepo may be worked on through multiple agentic coding sessions in parallel.

To avoid conflicts:

- one task should map to one branch
- one branch should ideally map to one worktree or isolated working directory
- one agent session should focus on one primary module or one tightly scoped task
- shared files should not be edited simultaneously by multiple agent sessions
- broad cross-module refactors should be split into dedicated tasks

Recommended principle:

**one session = one scoped task = one primary write target**

The agent may inspect other modules, but should not create cross-module churn.

---

## Cross-Module Understanding

It is valid for the agent to inspect other modules in order to understand:

- auth patterns
- API design
- DTO shapes
- naming conventions
- logging style
- error handling
- testing patterns
- deployment assumptions
- infrastructure coupling
- message/event flow
- integration boundaries

This inspection is for understanding and reference.

It does **not** grant permission to modify those other modules by default.

---

## Local Documentation Priority

When working inside a specific module, prefer local documentation and local conventions over assumptions from other modules.

Priority order:

1. direct user request
2. local module `AGENTS.md`
3. local module `README.md`
4. local module `ARCHITECTURE.md`
5. root `AGENTS.md`
6. root `README.md`
7. related docs in `docs/`
8. patterns from other modules

If documentation conflicts, prefer the most local and most task-relevant source.

---

## Command Execution Rules

Before running commands, determine whether they belong to:
- root workspace scope, or
- a specific module scope

For module-specific commands, enter that module directory first.

Examples of commands that are usually module-scoped:
- `git`
- `docker compose`
- builds
- tests
- migrations
- linting
- local generators

Do not assume root-level command behavior applies to every module.

Always check the module’s own files first.

---

## Change Discipline

The agent must keep changes disciplined.

### Required behavior
- keep changes minimal
- stay within target scope
- follow local module conventions
- update only directly relevant tests/docs
- avoid unnecessary file movement
- avoid introducing new abstractions unless clearly needed

---

## AI Session Notes as Context

The folder `docs/ai-sessions/` may contain useful historical context such as:
- prior decisions
- design discussions
- implementation notes
- problem analysis
- tradeoff reasoning
- partial plans

These files may be used as supporting context, but they should not override explicit documentation or the current user request unless clearly still valid.

Treat them as helpful context, not automatic source of truth.

---

## Definition of Done

A task is considered done when:

- the requested change is implemented in the intended target scope
- the diff is focused and minimal
- unrelated modules were not modified
- shared/protected files were not changed unless explicitly required
- implementation follows local module conventions
- relevant tests or validations are updated where appropriate
- documentation is updated only when directly relevant

In short:

**Read the whole monorepo if needed.  
Write only in the intended module.  
Treat shared contracts and shared cross-module files as protected by default.**