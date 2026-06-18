const DEFAULT_TRACKING_SHEET_NAME = 'public_order_tracking';
const NOT_SCHEDULED = 'Not scheduled yet';
const UNKNOWN_STATUS = 'Order status is being updated';

const TIMELINE_STEPS = [
  { code: 'order_received', label: 'Order received' },
  { code: 'pickup_scheduling', label: 'Pickup scheduling' },
  { code: 'pickup_scheduled', label: 'Pickup scheduled' },
  { code: 'picked_up', label: 'Picked up' },
  { code: 'in_transit', label: 'In transit' },
  { code: 'delivery_scheduling', label: 'Delivery scheduling' },
  { code: 'delivered', label: 'Delivered' },
];

function doPost(e) {
  try {
    if (e && e.pathInfo && e.pathInfo !== 'track-order') {
      return jsonResponse({
        found: false,
        verified: false,
        message: 'Tracking endpoint was not found.',
      });
    }

    const payload = parsePayload(e);
    return jsonResponse(trackOrder(payload));
  } catch (error) {
    console.error(error);
    return jsonResponse({
      found: false,
      verified: false,
      message: 'Technical error. Please try again later.',
    });
  }
}

function trackOrder(payload) {
  const orderId = normalizeText(payload.order_id);
  const phoneLast4 = normalizeText(payload.phone_last4).replace(/\D/g, '');

  if (!orderId || !/^\d{4}$/.test(phoneLast4)) {
    return {
      found: false,
      verified: false,
      message: 'Order was not found. Please check your Order ID.',
    };
  }

  const rows = loadTrackingRows();
  const matchingRows = rows.filter((row) => normalizeText(row.order_id) === orderId);

  if (matchingRows.length === 0) {
    return {
      found: false,
      verified: false,
      message: 'Order was not found. Please check your Order ID.',
    };
  }

  const verifiedRows = matchingRows.filter((row) => getLast4Digits(row.phone_masked) === phoneLast4);

  if (verifiedRows.length === 0) {
    return {
      found: true,
      verified: false,
      message: 'The phone digits do not match this order.',
    };
  }

  const latestRow = getLatestRow(verifiedRows);
  const pickupRow = getLatestTypedRow(verifiedRows, 'pickup') || latestRow;
  const deliveryRow = getLatestTypedRow(verifiedRows, 'delivery') || latestRow;
  const clientStatus = mapClientStatus(latestRow, pickupRow);

  return {
    found: true,
    verified: true,
    order_id: orderId,
    phone_masked: normalizeText(latestRow.phone_masked),
    client_status: clientStatus.label,
    status_description: clientStatus.description,
    pickup_date: formatDateValue(pickupRow.pickup_due_date),
    pickup_window: formatTimeWindow(pickupRow.earliest_time, pickupRow.latest_time),
    delivery_date: formatDateValue(deliveryRow.delivery_due_date),
    delivery_window: formatTimeWindow(deliveryRow.earliest_time, deliveryRow.latest_time),
    last_updated: formatDateValue(latestRow.last_change_date),
    timeline: buildTimeline(clientStatus.timelineCode),
  };
}

function loadTrackingRows() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const sheetName = properties.getProperty('TRACKING_SHEET_NAME') || DEFAULT_TRACKING_SHEET_NAME;

  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID Script Property is not configured.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map((header) => normalizeHeader(header));

  return values.slice(1).map((row) => {
    const record = {};

    headers.forEach((header, index) => {
      if (header) {
        record[header] = row[index];
      }
    });

    return record;
  });
}

function mapClientStatus(row, pickupRow) {
  const rawStatus = normalizeText(row.crm_status);
  const key = rawStatus.toLowerCase();
  const hasPickupSchedule = isScheduledDate(pickupRow.pickup_due_date)
    || formatTimeWindow(pickupRow.earliest_time, pickupRow.latest_time) !== NOT_SCHEDULED;

  if (key === 'pick-up finished. photo & bol uploaded') {
    return status('Picked up', 'Pickup has been completed.', 'picked_up');
  }

  if (key === 'sent interstate') {
    return status('In transit', 'Order is in transit.', 'in_transit');
  }

  if (key === 'submitted for delivery' || key === 'buyer hours collected') {
    return status('Delivery scheduling in progress', 'Delivery scheduling is in progress.', 'delivery_scheduling');
  }

  if (key === 'delivery finished') {
    return status('Delivered', 'Order has been delivered.', 'delivered');
  }

  if (key === 'order canceled') {
    return status('Order canceled', 'Order has been canceled.', 'order_received');
  }

  if (key === 'payment confirmed. order finished' || key === '142') {
    return status('Order finished', 'Order has been completed.', 'delivered');
  }

  if (key === '143') {
    return status(UNKNOWN_STATUS, 'Final order status is being verified.', 'order_received');
  }

  if (key === 'submitted for pick-up') {
    if (hasPickupSchedule) {
      return status('Pickup scheduled', 'Pickup has been scheduled.', 'pickup_scheduled');
    }

    return status('Pickup requested', 'Pickup has been requested.', 'pickup_scheduling');
  }

  if (hasPickupSchedule) {
    return status('Pickup scheduled', 'Pickup has been scheduled.', 'pickup_scheduled');
  }

  if (key === 'new lead' || key === 'order has been received') {
    return status('Order received', 'Order has been received.', 'order_received');
  }

  if (key === 'seller business hours collected') {
    return status('Pickup scheduling in progress', 'Pickup scheduling is in progress.', 'pickup_scheduling');
  }

  return status(UNKNOWN_STATUS, 'Order status is being updated.', 'order_received');
}

function buildTimeline(currentCode) {
  const currentIndex = Math.max(0, TIMELINE_STEPS.findIndex((step) => step.code === currentCode));

  return TIMELINE_STEPS.map((step, index) => {
    let state = 'pending';

    if (index < currentIndex) {
      state = 'done';
    } else if (index === currentIndex) {
      state = 'current';
    }

    return {
      code: step.code,
      label: step.label,
      state,
    };
  });
}

function getLatestTypedRow(rows, type) {
  const typedRows = rows.filter((row) => normalizeText(row.type).toLowerCase() === type);
  return typedRows.length > 0 ? getLatestRow(typedRows) : null;
}

function getLatestRow(rows) {
  return rows.reduce((latest, row) => {
    const latestTime = getDateTime(latest.last_change_date);
    const rowTime = getDateTime(row.last_change_date);
    return rowTime >= latestTime ? row : latest;
  }, rows[0]);
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function status(label, description, timelineCode) {
  return { label, description, timelineCode };
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getLast4Digits(value) {
  const digits = normalizeText(value).replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '';
}

function formatDateValue(value) {
  const date = toValidDate(value);

  if (!date) {
    return NOT_SCHEDULED;
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM d, yyyy');
}

function formatTimeWindow(startValue, endValue) {
  const start = formatTimeValue(startValue);
  const end = formatTimeValue(endValue);

  if (!start || !end) {
    return NOT_SCHEDULED;
  }

  return `${start} - ${end}`;
}

function formatTimeValue(value) {
  if (isInvalidCellValue(value)) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'h:mm a');
  }

  if (typeof value === 'number' && value >= 0 && value < 1) {
    const millis = Math.round(value * 24 * 60 * 60 * 1000);
    return Utilities.formatDate(new Date(Date.UTC(1899, 11, 30) + millis), 'UTC', 'h:mm a');
  }

  const text = normalizeText(value);

  if (!text) {
    return '';
  }

  if (/^\d{1,2}:\d{2}(\s?[AP]M)?$/i.test(text)) {
    return text.toUpperCase().replace(/\s?([AP]M)$/i, ' $1');
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? ''
    : Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'h:mm a');
}

function isScheduledDate(value) {
  return formatDateValue(value) !== NOT_SCHEDULED;
}

function getDateTime(value) {
  const date = toValidDate(value);
  return date ? date.getTime() : 0;
}

function toValidDate(value) {
  if (isInvalidCellValue(value)) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isInvalidCellValue(value) {
  const text = normalizeText(value);

  if (!text) {
    return true;
  }

  return /^#(ERROR|N\/A|VALUE!|REF!|DIV\/0!|NAME\?|NUM!|NULL!)$/i.test(text);
}
