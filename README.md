# CribSheets (React)

Fresh Bun + Vite + React + TypeScript app for porting the legacy ASP.NET CribSheets timesheet UI.

The .NET source lives beside this repo at `../CribSheets`. A local **junction** puts it at `legacy/CribSheets` for reference; that path is **gitignored** and never committed.

## Prerequisites

- [Bun](https://bun.sh/)
- [.NET 7 SDK](https://dotnet.microsoft.com/download/dotnet/7.0) — only if you run the legacy app from `legacy/`

## Setup

```powershell
bun run setup:legacy   # one-time: legacy\CribSheets → ..\CribSheets
bun install
```

Each machine needs `setup:legacy` once (or run `scripts/setup-legacy.ps1` manually).

## Development

```powershell
bun dev

# Optional: legacy API/UI in another terminal
dotnet run --project legacy/CribSheets/CribSheets/CribSheets.csproj
```

## Layout

| Path | Purpose |
|------|---------|
| `src/` | React app |
| `legacy/CribSheets/` | Junction to `../CribSheets` — not in git |

Original app: [lockstock123/CribSheets](https://github.com/lockstock123/CribSheets)
