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
| `pickup_due_date` | No | Public pickup date after validation. |
| `delivery_due_date` | No | Public delivery date after validation. |
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
| `pickup_date` | Valid formatted date or `Not scheduled yet`. |
| `pickup_window` | Valid formatted window or `Not scheduled yet`. |
| `delivery_date` | Valid formatted date or `Not scheduled yet`. |
| `delivery_window` | Valid formatted window or `Not scheduled yet`. |
| `last_updated` | Valid formatted date or `Not scheduled yet`. |
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
5. Use the latest verified `delivery` row for delivery date/window when available.

Invalid dates and empty windows must return `Not scheduled yet`.
