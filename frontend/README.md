# LineMaster SSD Frontend

React + Vite interface for simulation-driven shift planning.

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the app at `http://localhost:5173`.

## Required Backend

The UI expects the Flask API at `http://localhost:5000/api/simulate`.

If the backend is not running, the UI now shows an explicit connection error with retry options.

## Build and Lint

```bash
npm run lint
npm run build
```

## Usability Improvements Implemented

- Field-level input validation with accessible errors.
- Better loading feedback and timeout handling.
- Actionable API error messaging with retry/reset controls.
- Responsive form and result layouts for desktop/tablet/mobile.
- Copy-to-clipboard support for the generated action plan.
- Dynamics page with advanced controls for adjusting simulation assumptions.
