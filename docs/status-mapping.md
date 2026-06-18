# Status Mapping

## CRM Status to Client Status

| CRM status | Client status | Timeline step |
| --- | --- | --- |
| `New lead` | `Order received` | Order received |
| `Order has been received` | `Order received` | Order received |
| `Seller business hours collected` | `Pickup scheduling in progress` | Pickup scheduling |
| `Submitted for pick-up` with pickup date or time window | `Pickup scheduled` | Pickup scheduled |
| `Submitted for pick-up` without pickup date or time window | `Pickup requested` | Pickup scheduling |
| `Pick-up finished. Photo & Bol uploaded` | `Picked up` | Picked up |
| `Sent interstate` | `In transit` | In transit |
| `Submitted for delivery` | `Delivery scheduling in progress` | Delivery scheduling |
| `Buyer hours collected` | `Delivery scheduling in progress` | Delivery scheduling |
| `Delivery finished` | `Delivered` | Delivered |
| `Order canceled` | `Order canceled` | Order received |
| `Payment confirmed. Order finished` | `Order finished` | Delivered |
| `142` | `Order finished` | Delivered |
| `143` | `Order status is being updated` | Order received |

## Unknown Statuses

Unknown, empty, or ambiguous CRM statuses return:

```text
Order status is being updated
```

This avoids exposing raw CRM statuses and avoids showing a wrong final status.

## Scheduled / Not Scheduled

Dates:

- valid date -> format as `MMM d, yyyy`;
- empty value -> `Not scheduled yet`;
- invalid value or formula error -> `Not scheduled yet`.

Time windows:

- valid `earliest_time` and valid `latest_time` -> format as `h:mm AM/PM - h:mm AM/PM`;
- missing either side -> `Not scheduled yet`;
- invalid value or formula error -> `Not scheduled yet`.

For `Submitted for pick-up`, the client status is:

- `Pickup scheduled` if pickup date or pickup time window exists;
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
