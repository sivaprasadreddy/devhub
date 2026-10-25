# Technology Stack

## Desktop Application

- **Wails v3** — packages the application as a native desktop app and connects the Go backend to the web frontend.
- **Go 1.27** — implements application startup, storage, and backend services.
- **Go embed** — bundles the compiled frontend assets and SQL migrations into the application binary.

## Frontend

- **React 18** — builds the user interface with reusable components.
- **TypeScript** — provides static typing for frontend code.
- **React Router 7** — handles client-side navigation between application pages.
- **React DayPicker** — supplies date-selection controls.
- **Wails runtime** — enables communication between the frontend and Go services.
- **Vite 8** — runs the frontend development server and creates production builds.
- **CSS** — provides the application's responsive layout and visual styling.
- **Prettier** — formats frontend source files.

## Data and Backend

- **SQLite** (`modernc.org/sqlite`) — stores application data locally without an external database server.
- **Goose** — applies embedded, versioned SQL database migrations at startup.
- **Wails service bindings** — expose the contacts, notes, assets, cards, and transactions Go services to TypeScript.

## Build and Packaging

- **Task** and **Wails CLI** — coordinate development, build, and packaging workflows.
- Platform-specific packaging configuration is included for **macOS, Windows, Linux, Android, and iOS**.

