# Status Mapping

## CRM Status to Client Status

| CRM status | Client status | Timeline step |
| --- | --- | --- |
| `1. New lead` / `New lead` | `Order received` | Order received |
| `2. Order has been received` / `Order has been received` | `Order received` | Order received |
| `3. Seller business hours collected` / `Seller business hours collected` | `Pickup scheduling in progress` | Pickup scheduling |
| `4. Submitted for pick-up` / `Submitted for pick-up` with pickup date or time window | `Pickup scheduled` | Pickup scheduled |
| `4. Submitted for pick-up` / `Submitted for pick-up` without pickup date or time window | `Pickup requested` | Pickup scheduling |
| `5. Pick-up finished. Photo & Bol uploaded` / `Pick-up finished. Photo & Bol uploaded` | `Picked up` | Picked up |
| `6. Sent interstate` / `Sent interstate` | `In transit` | In transit |
| `7. Received interstate` / `Received interstate` | `In transit` | In transit |
| `8. Buyer business hours collected` / `Buyer business hours collected` | `Delivery scheduling in progress` | Delivery scheduling |
| `9. Submitted for delivery` / `Submitted for delivery` | `Delivery scheduling in progress` | Delivery scheduling |
| `10. Delivery finished. Photo & bol uploaded` / `Delivery finished` | `Delivered` | Delivered |
| `Order canceled` | `Order canceled` | Order received |
| `Payment confirmed. Order finished` | `Order finished` | Delivered |
| `142` | `Order finished` | Delivered |
| `143` | `Order status is being updated` | Order received |

## Unknown Statuses

Unknown, empty, or ambiguous CRM statuses without a valid pickup schedule return:

```text
Order status is being updated
```

This avoids exposing raw CRM statuses and avoids showing a wrong final status.

Number prefixes like `4. ` are ignored before mapping.

## Scheduled / Not Scheduled

Dates:

- valid date -> format as `MMM d, yyyy`;
- empty value -> `Not scheduled yet`;
- invalid value or formula error -> `Not scheduled yet`.

Time windows:

- valid `earliest_time` and valid `latest_time` -> format as `h:mm AM/PM - h:mm AM/PM`;
- missing either side -> `Not scheduled yet`;
- invalid value or formula error -> `Not scheduled yet`.

For pickup scheduling, the client status is:

- `Pickup scheduled` if CRM status is `Submitted for pick-up` and pickup date or pickup time window exists;
- `Pickup requested` if neither exists.

## Timeline

The client timeline is stable:

```text
Order received
Pickup scheduling
Pickup scheduled
Picked up
In transit
Delivery scheduling
Delivered
```

Each step returns one of:

- `done`
- `current`
- `pending`
