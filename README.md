# Order Tracking MVP

Minimal client-facing order tracking portal by Order ID.

## Scope

- Static frontend in `public/`.
- Google Apps Script API in `apps-script/`.
- Google Spreadsheet as the source of truth.
- Public response only: no full phone, raw CRM fields, internal links, notes, manager, team, address, weight, package count, or spreadsheet URL.

## MVP Flow

1. Client enters Order ID.
2. Frontend sends a POST request to the Apps Script Web App endpoint.
3. Apps Script reads `public_order_tracking`, maps CRM status to client status, and returns a public response.
4. Frontend displays current status, pickup/delivery dates, time windows, last update, and progress timeline.

## Structure

```text
/
  README.md
  AGENTS.md
  public/
    index.html
    styles.css
    app.js
  apps-script/
    Code.gs
    appsscript.json
  docs/
    data-contract.md
    setup.md
    status-mapping.md
  tests/
    test-cases.md
```

## Configuration

Set these Script Properties in Google Apps Script:

- `SPREADSHEET_ID`
- `TRACKING_SHEET_NAME`

Then paste the deployed Apps Script Web App URL into `TRACKING_API_URL` in `public/app.js`.

Detailed setup: [docs/setup.md](docs/setup.md).

## Test Example

```text
order_id: 22913624
```

Test cases: [tests/test-cases.md](tests/test-cases.md).
