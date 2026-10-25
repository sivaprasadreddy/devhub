# Repository Guidelines

## Project Structure & Module Organization

- This repository is a Wails v3 desktop application with a Go backend and a React/TypeScript frontend. 
- The `main.go` configures the application, window, events, and embedded frontend assets; 
- Backend services such as `ProjectService` live in "backend" Go files. 
- Frontend source is under `frontend/src/`, static assets are in `frontend/public/`, and generated Wails bindings are in `frontend/bindings/`. 
- Platform-specific build and packaging tasks live under `build/`. 
- Treat `bin/` and `frontend/dist/` as generated output; do not edit them directly.

## Build, Test, and Development Commands

- `wails3 dev`: run the desktop application with backend and frontend hot reload.
- `wails3 build`: create a production build using the repository Taskfiles.
- `task build`: dispatch the build to the current platform-specific task.
- `task package`: produce an installable platform package.
- `go test ./...`: run all Go tests.
- `cd frontend && npm ci`: install the locked frontend dependencies.
- `cd frontend && npm run build`: type-check TypeScript and build production assets.
- `cd frontend && npm run preview`: serve the built frontend for inspection.

## Coding Style & Naming Conventions

- Format Go code with `gofmt`; use tabs, exported identifiers in PascalCase, and local identifiers in camelCase. 
- Keep Wails services small and register them in `main.go`. 
- In TypeScript/React, use two-space indentation, PascalCase component names, camelCase functions and variables, and `.tsx` for JSX-bearing files. 
- Preserve the existing semicolon-light style unless an automated formatter is introduced. 
- Never hand-edit generated files in `frontend/bindings/`.

## Commit & Pull Request Guidelines
- Use concise, imperative commit subjects, optionally scoped (for example, `frontend: improve greeting validation`). 
- Pull requests should explain the behavior change, list verification commands, link related issues, and include screenshots or recordings for visible UI changes. 
