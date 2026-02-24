🚧 UK Crime Intelligence Dashboard (Airtable Interface)

This repository contains an Airtable Interface extension and automation scripts for a UK crime intelligence dashboard.

## What’s in here
- `frontend/src`: Interface UI (React)
- `frontend/styles`: SCSS and compiled CSS
- `frontend/automation-scripts`: Airtable automation scripts

## Public interface
- https://airtable.com/appS5lvCqeD1S6IVJ/shreoya1vcTiapLWM

## Local development
1. Install dependencies:
   - `npm install`
2. Build styles:
   - `npm run build:css`
3. Run the Airtable Interface in development mode (Airtable UI will load from `https://localhost:9000`).

## Notes
- Update automation scripts by copying from `frontend/automation-scripts` into Airtable.
- Month fields are handled as select/date/text depending on your base configuration.

