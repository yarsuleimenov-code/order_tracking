# Test Cases

## Scope

Validate the MVP client order tracking flow using Apps Script backend and static frontend.

## Cases

| # | Case | Input | Expected Result |
| --- | --- | --- | --- |
| 1 | Existing Order ID + correct last 4 digits | `22913624`, `2464` | Order is shown with public status, dates/windows, last update, and timeline. |
| 2 | Existing Order ID + wrong last 4 digits | Existing order, wrong digits | Access is denied with `The phone digits do not match this order.` |
| 3 | Nonexistent Order ID | Unknown order, any 4 digits | `Order was not found. Please check your Order ID.` |
| 4 | Order ID with multiple rows | Order with pickup and delivery rows | Latest status uses max `last_change_date`; pickup/delivery details come from matching `type` rows. |
| 5 | Empty pickup date | Existing order with empty `pickup_due_date` | Pickup date displays `Not scheduled yet`. |
| 6 | Empty delivery date | Existing order with empty `delivery_due_date` | Delivery date displays `Not scheduled yet`. |
| 7 | Empty time window | Empty `earliest_time` or `latest_time` | Window displays `Not scheduled yet`. |
| 8 | Unknown `crm_status` | Unmapped status | UI displays `Order status is being updated`; raw status is not shown. |
| 9 | `Order canceled` status | Matching order with canceled status | UI displays `Order canceled`; internal fields are not shown. |
| 10 | Formula error in date/time | `#ERROR!`, `#N/A`, or invalid value | UI displays `Not scheduled yet`; no raw formula error is shown. |

## Frontend Checks

- Loading state appears after submitting.
- Found state shows only public fields.
- Not found state uses a clear message.
- Wrong phone state does not reveal order details.
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
