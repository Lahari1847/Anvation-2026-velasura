# EcoRoute AI

Local smart-city waste operations demo with role-based sign-in, a controlled citizen complaint workflow, zone summaries, a simple estimate endpoint, and baseline-versus-optimized scenario calculations. It runs on a local SQLite database and does not require a paid API.

## Requirements and start (Windows)

Install Python 3.11 or newer and Node.js 20.19+ or 22.12+, then double-click `run_ecoroute.bat`. On first run it creates `.venv`, installs pinned dependencies, initializes the SQLite database, installs frontend dependencies and opens the app. Initial setup needs internet for package installation. Map tiles/routing are not required; core demo screens work offline after dependencies are installed.

Rerun `run_ecoroute.bat` for later sessions. Close the two titled terminal windows to stop the project. `stop_ecoroute.bat` explains the safe stop procedure and does not kill unrelated processes.

- Frontend: http://localhost:5173
- Backend: http://127.0.0.1:8000
- API docs: http://127.0.0.1:8000/docs

## Demo accounts

All demo accounts use `EcoRoute123!`: `admin`, `office`, `field`, `driver`, and `citizen`. These are public local demonstration credentials only.

## Features

- Role-aware dashboard navigation for municipal admin, office worker, field worker, truck driver, and citizen.
- Citizen report submission; office verification; manually confirmed worker assignment; field task status progression; office resolution approval; server-side role and ownership checks.
- SQLite initialization with seeded zones, vehicles, and demo accounts.
- High-demand scenario calculator with identical input demand for baseline and optimized calculations and capacity, shift, and worker constraints.
- Zone demand estimate and comparison dashboard. Estimates are synthetic and clearly labeled.

## Data and reset

`data/synthetic/` holds sample CSV data; `data/raw/` is reserved for unchanged public originals; `data/processed/` for derived copies; `data/metadata/dataset_catalog.csv` records provenance. `DATA_SOURCES.md` describes the OGD resource and explicitly states it was not downloaded. To reset local demo records, stop the app, delete `data/ecoroute.db`, then rerun `python scripts/initialize_database.py` inside the project virtual environment.

## Tests

From the project folder: `.\.venv\Scripts\pytest.exe -q` (PowerShell) or `.venv\Scripts\pytest.exe -q` (Command Prompt). Tests cover demo login, role restrictions, complaint flow, citizen ownership, and simulation constraints.

## ZIP

Run `scripts\package.ps1` from PowerShell to create a numbered ZIP in `outputs` without including the database, virtual environment, node_modules, or build caches.

## Scope and limitations

This is a substantial hackathon-ready local prototype, not an operational municipal deployment. It does not yet implement photo upload/evidence, account CRUD, production session tokens, rate limiting, full audit UI, live GPS, external road routing, actual learned forecasts, or full truck-route assignment. Forecast uplift and scenario fuel/emissions are illustrative formulas, not measured savings. No tests are claimed until executed in the target environment.
