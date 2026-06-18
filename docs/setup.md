# Setup

## Goal

Deploy a Google Apps Script Web App that reads `public_order_tracking` and returns only public tracking data to the static frontend.

## 1. Open Apps Script

1. Open the Google Spreadsheet.
2. Go to `Extensions` -> `Apps Script`.
3. Create a new Apps Script project if one does not exist.

## 2. Add Backend Code

1. Open `apps-script/Code.gs` from this repository.
2. Copy its content into the Apps Script editor `Code.gs`.
3. Open `apps-script/appsscript.json`.
4. In Apps Script, enable manifest editing in project settings if needed.
5. Copy the manifest content into `appsscript.json`.

## 3. Configure Script Properties

In Apps Script:

1. Go to `Project Settings`.
2. Open `Script Properties`.
3. Add:

```text
SPREADSHEET_ID=13r1d5OSA5zqX1u1Xp7TWbHsOYS6fuTl1YO5jCuKalvg
TRACKING_SHEET_NAME=public_order_tracking
```

Do not put secrets in frontend files.

## 4. Deploy Web App

1. Click `Deploy` -> `New deployment`.
2. Select type `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Deploy.
6. Authorize the script when prompted.

## 5. Configure Frontend

1. Copy the Web App URL.
2. In `public/app.js`, replace:

```js
PASTE_APPS_SCRIPT_WEB_APP_URL_HERE
```

with:

```js
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

The frontend must call only this Apps Script endpoint, not the Google Spreadsheet URL.

## 6. Test

Open `public/index.html` in a browser and test:

```text
Order ID: 22913624
Last 4 digits: 2464
```

Expected result:

- order is found;
- phone digits are verified;
- public status is displayed;
- no full phone, raw CRM status, spreadsheet URL, or internal fields are shown.

For more cases, use `tests/test-cases.md`.

## Known Limitations

- No customer account or full authorization.
- No database.
- No direct frontend spreadsheet access.
- Address is intentionally not shown in the MVP UI.
- Apps Script cannot set custom HTTP status codes through `ContentService`; errors are returned as JSON messages.
