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
| `phone_masked` | Yes | Masked phone, used only to verify last 4 digits. |
| `recipient_name` | No | Not returned in MVP response. |
| `type` | No | `pickup` or `delivery`; used to select date/window rows. |
| `scheduled_date` | No | Appointment date for the matching pickup or delivery row when scheduled. |
| `pickup_due_date` | No | Fallback pickup due date when `scheduled_date` is not available. |
| `delivery_due_date` | No | Estimated delivery date when no delivery appointment row is available. |
| `last_change_date` | No | Used to choose latest row and shown as last update after validation. |

## Public Response Fields

| Field | Rule |
| --- | --- |
| `found` | Whether Order ID exists. |
| `verified` | Whether phone last 4 digits match. |
| `order_id` | Echoed public Order ID. |
| `phone_masked` | Masked phone only, never full phone. |
| `client_status` | Mapped public status. |
| `status_description` | Short public explanation. |
| `pickup_date` | `scheduled_date` from pickup row, fallback to `pickup_due_date`, or `Not scheduled yet`. |
| `pickup_window` | Pickup row `earliest_time - latest_time` from display values, or `Not scheduled yet`. |
| `delivery_label` | `Delivery scheduled` when a delivery appointment exists, otherwise `Estimated delivery`. |
| `delivery_date` | Delivery row `scheduled_date` when available; otherwise estimated `delivery_due_date`. |
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

1. Verify all rows against `phone_masked`.
2. Use all verified rows.
3. Choose latest current status by maximum `last_change_date`.
4. Use the latest verified `pickup` row for pickup date/window when available.
5. Use the latest verified `delivery` row only for delivery appointment date/window.
6. If no delivery appointment exists, use `delivery_due_date` as estimated delivery and return delivery window as `Not scheduled yet`.

Public date/time fields must be based on Google Sheets display values. Invalid dates, formula errors, and empty windows must return `Not scheduled yet`.
