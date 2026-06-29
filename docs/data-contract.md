# Data Contract

## Source

Google Spreadsheet sheet:

```text
public_order_tracking
```

## Input Columns

| Column | Required | Purpose |
| --- | --- | --- |
| `order_id` | Yes | Public lookup key entered by client. |
| `crm_status` | Yes | Internal CRM status mapped to public status. |
| `address_line_1` | No | Not returned in MVP UI. |
| `earliest_time` | No | Start of pickup or delivery time window. |
| `latest_time` | No | End of pickup or delivery time window. |
| `phone_masked` | No | Source field retained in sheet, not used or returned in Order ID-only MVP. |
| `recipient_name` | No | Not returned in MVP response. |
| `type` | No | `pickup` or `delivery`; used to select date/window rows. |
| `scheduled_date` / `PU date` / `pickup_due_date` | No | Appointment or pickup date for the matching pickup row. |
| `delivery_due_date` / `Delivery Due` | No | Estimated delivery date when no delivery appointment row is available. |
| `last_change_date` / `Last change date` | No | Used to choose latest row and shown as last update after validation. |

## Public Response Fields

| Field | Rule |
| --- | --- |
| `found` | Whether Order ID exists. |
| `verified` | `true` when Order ID exists. Kept for backward response compatibility. |
| `order_id` | Echoed public Order ID. |
| `client_status` | Mapped public status. |
| `status_description` | Short public explanation. |
| `pickup_date` | `scheduled_date`, `PU date`, or `pickup_due_date` from pickup row, or `Not scheduled yet`. |
| `pickup_window` | Pickup row `earliest_time - latest_time` from display values, or `Not scheduled yet`. |
| `delivery_label` | `Delivery scheduled` when a delivery appointment exists, otherwise `Estimated delivery`. |
| `delivery_date` | Delivery row `scheduled_date` when available; otherwise estimated `delivery_due_date` / `Delivery Due`. |
| `delivery_window` | Delivery row time window only when delivery appointment exists; otherwise `Not scheduled yet`. |
| `last_updated` | `last_change_date` from display values or `Not scheduled yet`. |
| `timeline` | Stable client-facing progress steps. |

## Do Not Return

- full phone number;
- internal notes;
- raw CRM links;
- seller website;
- responsible manager;
- team;
- package count;
- weight;
- Google Spreadsheet URL;
- raw internal status without mapping;
- raw formula errors such as `#ERROR!`;
- full address in the MVP UI.

## Multiple Rows Per Order

If multiple rows match one `order_id`:

1. Use all rows matching `order_id`.
2. Choose latest current status by maximum `last_change_date`.
3. Use the latest matching `pickup` row for pickup date/window when available.
4. Use the latest matching `delivery` row only for delivery appointment date/window.
5. If no delivery appointment exists, use `delivery_due_date` as estimated delivery and return delivery window as `Not scheduled yet`.

Public date/time fields must be based on Google Sheets display values. Invalid dates, formula errors, and empty windows must return `Not scheduled yet`.

## Access Model

This MVP uses Order ID as the only lookup key. It is simpler for customers, but it is not strong authentication. Do not expose private fields in the response.
