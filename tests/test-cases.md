# Test Cases

## Scope

Validate the MVP client order tracking flow using Apps Script backend and static frontend.

## Cases

| # | Case | Input | Expected Result |
| --- | --- | --- | --- |
| 1 | Existing Order ID | `22913624` | Order is shown with public status, dates/windows, last update, and timeline. |
| 2 | Empty Order ID | Empty input | User is asked to enter Order ID. |
| 3 | Nonexistent Order ID | Unknown order | `Order was not found. Please check your Order ID.` |
| 4 | Order ID with multiple rows | Order with pickup and delivery rows | Latest status uses max `last_change_date`; pickup/delivery details come from matching `type` rows. |
| 5 | Empty pickup date | Existing order with empty `pickup_due_date` | Pickup date displays `Not scheduled yet`. |
| 6 | Empty delivery date | Existing order with empty `delivery_due_date` | Delivery date displays `Not scheduled yet`. |
| 7 | Empty time window | Empty `earliest_time` or `latest_time` | Window displays `Not scheduled yet`. |
| 8 | Unknown `crm_status` without pickup schedule | Unmapped status and no pickup date/window | UI displays `Order status is being updated`; raw status is not shown. |
| 9 | `Order canceled` status | Matching order with canceled status | UI displays `Order canceled`; internal fields are not shown. |
| 10 | Formula error in date/time | `#ERROR!`, `#N/A`, or invalid value | UI displays `Not scheduled yet`; no raw formula error is shown. |
| 11 | Number-prefixed pickup status | `4. Submitted for pick-up` with pickup date or pickup window | UI displays `Pickup scheduled`; timeline current step is `Pickup scheduled`. |
| 12 | Number-prefixed transit status | `6. Sent interstate` or `7. Received interstate` | UI displays `In transit`; timeline current step is `In transit`. |
| 13 | Buyer hours collected status | `8. Buyer business hours collected` | UI displays `Delivery scheduling in progress`; timeline current step is `Delivery scheduling`. |
| 14 | Submitted for delivery status | `9. Submitted for delivery` | UI displays `Delivery scheduled`; timeline current step is `Delivery scheduled`. |
| 15 | Pickup display values | `22913624`, `2464` with `06/18/2026` or `06/18/2026 00:00:00` display date | Pickup date displays `Jun 18, 2026`; pickup window displays `09:00 AM - 05:00 PM`; no `10:38 PM - 6:38 AM` artifact appears. |
| 16 | Estimated delivery without delivery row | Pickup row has `delivery_due_date`, no delivery appointment row | UI displays `Estimated delivery`, delivery date, and `Not scheduled yet` for delivery window. |
| 17 | Delivery appointment row | Delivery row has `scheduled_date`, `earliest_time`, and `latest_time` | UI displays `Delivery scheduled`, delivery appointment date, delivery window, and Delivery scheduled progress step. |
| 18 | CRM-style date headers | Sheet has `PU date`, `Delivery Due`, and `Last change date` headers | Dates are read through header aliases and displayed publicly. |

## Frontend Checks

- Loading state appears after submitting.
- Found state shows only public fields.
- Not found state uses a clear message.
- Technical error state uses a generic message.

## Privacy Checks

Confirm the UI does not show:

- full phone;
- raw CRM status;
- internal notes;
- raw CRM links;
- seller website;
- responsible manager;
- team;
- package count;
- weight;
- Google Spreadsheet URL;
- full address.
