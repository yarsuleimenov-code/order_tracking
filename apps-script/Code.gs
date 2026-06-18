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
  { code: 'delivery_scheduled', label: 'Delivery scheduled' },
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
  const deliveryRow = getLatestTypedRow(verifiedRows, 'delivery');
  const deliveryDateRow = deliveryRow || latestRow;
  const clientStatus = mapClientStatus(latestRow, pickupRow);
  const deliveryAppointmentDate = deliveryRow ? getPublicDate(deliveryRow, ['scheduled_date', 'delivery_date']) : NOT_SCHEDULED;
  const hasDeliveryAppointment = deliveryAppointmentDate !== NOT_SCHEDULED;

  return {
    found: true,
    verified: true,
    order_id: orderId,
    phone_masked: normalizeText(latestRow.phone_masked),
    client_status: clientStatus.label,
    status_description: clientStatus.description,
    pickup_date: getPublicDate(pickupRow, ['scheduled_date', 'pu_date', 'pickup_date', 'pickup_due_date', 'pickup_due']),
    pickup_window: getPublicTimeWindow(pickupRow),
    delivery_label: hasDeliveryAppointment ? 'Delivery scheduled' : 'Estimated delivery',
    delivery_date: hasDeliveryAppointment
      ? deliveryAppointmentDate
      : getPublicDate(deliveryDateRow, ['delivery_due_date', 'delivery_due', 'estimated_delivery_date']),
    delivery_window: hasDeliveryAppointment ? getPublicTimeWindow(deliveryRow) : NOT_SCHEDULED,
    last_updated: getPublicDate(latestRow, ['last_change_date', 'last_change', 'last_updated']),
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

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  if (values.length < 2) {
    return [];
  }

  const headers = displayValues[0].map((header) => normalizeHeader(header));

  return values.slice(1).map((row, rowIndex) => {
    const displayRow = displayValues[rowIndex + 1];
    const record = {};
    const displayRecord = {};

    headers.forEach((header, index) => {
      if (header) {
        record[header] = row[index];
        displayRecord[header] = displayRow[index];
      }
    });

    record._display = displayRecord;
    return record;
  });
}

function mapClientStatus(row, pickupRow) {
  const rawStatus = normalizeText(row.crm_status);
  const key = normalizeCrmStatus(rawStatus);
  const hasPickupSchedule = getPublicDate(pickupRow, ['scheduled_date', 'pu_date', 'pickup_date', 'pickup_due_date', 'pickup_due']) !== NOT_SCHEDULED
    || getPublicTimeWindow(pickupRow) !== NOT_SCHEDULED;

  if (key === 'order canceled') {
    return status('Order canceled', 'Order has been canceled.', 'order_received');
  }

  if (key === 'payment confirmed. order finished' || key === '142') {
    return status('Order finished', 'Order has been completed.', 'delivered');
  }

  if (key === 'delivery finished' || key === 'delivery finished. photo & bol uploaded') {
    return status('Delivered', 'Order has been delivered.', 'delivered');
  }

  if (key === 'submitted for delivery') {
    return status('Delivery scheduled', 'Delivery has been scheduled.', 'delivery_scheduled');
  }

  if (key === 'buyer business hours collected' || key === 'buyer hours collected') {
    return status('Delivery scheduling in progress', 'Delivery scheduling is in progress.', 'delivery_scheduling');
  }

  if (key === 'sent interstate' || key === 'received interstate') {
    return status('In transit', 'Order is in transit.', 'in_transit');
  }

  if (key === 'pick-up finished. photo & bol uploaded') {
    return status('Picked up', 'Pickup has been completed.', 'picked_up');
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
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCrmStatus(value) {
  return normalizeText(value)
    .replace(/^\d+\.\s*/, '')
    .toLowerCase();
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

function getPublicDate(row, fields) {
  for (const field of fields) {
    const formatted = formatDisplayDate(getDisplayValue(row, field));

    if (formatted !== NOT_SCHEDULED) {
      return formatted;
    }

    const rawFormatted = formatDisplayDate(getRawValue(row, field));

    if (rawFormatted !== NOT_SCHEDULED) {
      return rawFormatted;
    }
  }

  return NOT_SCHEDULED;
}

function getPublicTimeWindow(row) {
  const start = formatDisplayTime(getDisplayValue(row, 'earliest_time'));
  const end = formatDisplayTime(getDisplayValue(row, 'latest_time'));

  if (!start || !end) {
    return NOT_SCHEDULED;
  }

  return `${start} - ${end}`;
}

function getDisplayValue(row, field) {
  if (!row) {
    return '';
  }

  if (row._display && row._display[field] !== undefined) {
    return row._display[field];
  }

  return row[field];
}

function getRawValue(row, field) {
  if (!row || row[field] === undefined) {
    return '';
  }

  return row[field];
}

function formatDisplayDate(value) {
  if (isInvalidCellValue(value)) {
    return NOT_SCHEDULED;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  const text = normalizeText(value);

  if (!text) {
    return NOT_SCHEDULED;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);

  if (isoMatch) {
    return formatDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)?$/i);

  if (usMatch) {
    const year = normalizeYear(Number(usMatch[3]));
    return formatDateParts(year, Number(usMatch[1]), Number(usMatch[2]));
  }

  if (/^[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}$/.test(text)) {
    return text;
  }

  return NOT_SCHEDULED;
}

function formatDisplayTime(value) {
  if (isInvalidCellValue(value)) {
    return '';
  }

  const text = normalizeText(value);

  if (!text) {
    return '';
  }

  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AP]M))?$/i);

  if (!timeMatch) {
    return '';
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = timeMatch[3] ? timeMatch[3].toUpperCase() : '';

  if (hours > 23 || minutes > 59) {
    return '';
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return '';
    }

    return `${pad2(hours)}:${pad2(minutes)} ${meridiem}`;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const twelveHour = hours % 12 || 12;
  return `${pad2(twelveHour)}:${pad2(minutes)} ${suffix}`;
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function formatDateParts(year, month, day) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return NOT_SCHEDULED;
  }

  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
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

  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?$/);

  if (dateMatch) {
    return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
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
