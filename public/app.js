const TRACKING_API_URL = 'https://script.google.com/macros/s/AKfycbzpDDSHD1k69cC3myA1rJnUJ7yZBRVj-IuMt9vq65-nU9G6Ax0uqXA9CAyG-_KIrVc6OQ/exec';

const form = document.querySelector('#tracking-form');
const orderIdInput = document.querySelector('#order-id');
const trackButton = document.querySelector('#track-button');
const trackButtonLabel = document.querySelector('#track-button-label');
const statusMessage = document.querySelector('#status-message');
const searchPanel = document.querySelector('.search-panel');
const verifiedSummary = document.querySelector('#verified-summary');
const verifiedOrder = document.querySelector('#verified-order');
const verifiedLookup = document.querySelector('#verified-lookup');
const trackAnotherButton = document.querySelector('#track-another-button');
const result = document.querySelector('#result');

const resultOrder = document.querySelector('#result-order');
const currentStatus = document.querySelector('#current-status');
const statusDescription = document.querySelector('#status-description');
const nextStepText = document.querySelector('#next-step-text');
const pickupDate = document.querySelector('#pickup-date');
const pickupWindow = document.querySelector('#pickup-window');
const deliveryHeading = document.querySelector('#delivery-heading');
const deliveryLabelValue = document.querySelector('#delivery-label-value');
const deliveryDate = document.querySelector('#delivery-date');
const deliveryWindow = document.querySelector('#delivery-window');
const lastUpdated = document.querySelector('#last-updated');
const timeline = document.querySelector('#timeline');
const contactSupportLink = document.querySelector('#contact-support-link');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const orderId = orderIdInput.value.trim();

  clearState();

  if (!orderId) {
    showMessage('Please enter your Order ID.', true);
    return;
  }

  if (TRACKING_API_URL.includes('PASTE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    showMessage('Tracking is not configured yet. Please try again later.', true);
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(TRACKING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const data = normalizeTrackingData(await response.json());
    renderResponse(data);
  } catch (error) {
    showMessage('We could not load your order right now. Please try again later.', true);
  } finally {
    setLoading(false);
  }
});

trackAnotherButton.addEventListener('click', () => {
  orderIdInput.value = '';
  showSearchForm();
  clearState();
  orderIdInput.focus();
});

function renderResponse(data) {
  if (!data || data.found === false) {
    showMessage('Order was not found. Please check your Order ID.', true);
    return;
  }

  resultOrder.textContent = `Order #${data.order_id || ''}`;
  currentStatus.textContent = data.client_status || 'Order status is being updated';
  statusDescription.textContent = data.status_description || '';
  nextStepText.textContent = getNextStep(data);
  pickupDate.textContent = data.pickup_date || 'Not scheduled yet';
  pickupWindow.textContent = data.pickup_window || 'Not scheduled yet';
  renderDeliveryDetails(data);
  deliveryDate.textContent = data.delivery_date || 'Not scheduled yet';
  lastUpdated.textContent = data.last_updated || 'Not scheduled yet';
  renderTimeline(Array.isArray(data.timeline) ? data.timeline : []);
  renderVerifiedSummary(data);

  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
  result.classList.remove('hidden');
}

function renderDeliveryDetails(data) {
  const isEstimated = data.delivery_label === 'Estimated delivery';

  deliveryHeading.textContent = isEstimated ? 'Estimated delivery' : 'Delivery appointment';
  deliveryLabelValue.textContent = isEstimated ? '' : data.delivery_label || '';
  deliveryWindow.textContent = isEstimated
    ? 'Delivery appointment is not scheduled yet.'
    : data.delivery_window || 'Not scheduled yet';
}

function renderVerifiedSummary(data) {
  verifiedOrder.textContent = `Tracking order #${data.order_id || ''}`;
  verifiedLookup.textContent = 'Lookup confirmed by Order ID';
  contactSupportLink.href = `mailto:support@example.com?subject=${encodeURIComponent(`Order tracking support #${data.order_id || ''}`)}`;
  searchPanel.classList.add('is-verified');
  verifiedSummary.classList.remove('hidden');
}

function showSearchForm() {
  searchPanel.classList.remove('is-verified');
  verifiedSummary.classList.add('hidden');
}

function renderTimeline(items) {
  timeline.replaceChildren();

  items.forEach((item) => {
    const row = document.createElement('li');
    row.className = item.state || 'pending';

    const marker = document.createElement('span');
    marker.className = 'marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = getMarker(item.state);

    const label = document.createElement('span');
    label.className = 'timeline-label';
    label.textContent = item.label || '';

    row.append(marker, label);
    timeline.append(row);
  });
}

function normalizeTrackingData(data) {
  const hasPickupSchedule = hasScheduledValue(data && data.pickup_date)
    || hasScheduledValue(data && data.pickup_window);
  const canApplyLegacyFallback = data && data.client_status === 'Order status is being updated';

  if (!data || data.found !== true || !hasPickupSchedule || !canApplyLegacyFallback) {
    return data;
  }

  const timelineItems = Array.isArray(data.timeline) ? data.timeline : [];
  const pickupScheduledIndex = getTimelineIndex(timelineItems, 'pickup_scheduled');
  const currentIndex = timelineItems.findIndex((item) => item.state === 'current');

  if (pickupScheduledIndex === -1 || currentIndex >= pickupScheduledIndex) {
    return data;
  }

  return {
    ...data,
    client_status: 'Pickup scheduled',
    status_description: 'Pickup has been scheduled.',
    timeline: timelineItems.map((item, index) => ({
      ...item,
      state: index < pickupScheduledIndex
        ? 'done'
        : index === pickupScheduledIndex
          ? 'current'
          : 'pending',
    })),
  };
}

function getTimelineIndex(items, code) {
  return items.findIndex((item) => item.code === code);
}

function hasScheduledValue(value) {
  return Boolean(value && value !== 'Not scheduled yet');
}

function getNextStep(data) {
  const status = (data.client_status || '').toLowerCase();

  if (status === 'pickup scheduled') {
    return 'Your item will be picked up during the scheduled pickup window.';
  }

  if (status === 'pickup scheduling in progress' || status === 'pickup requested') {
    return 'We are coordinating the pickup appointment.';
  }

  if (status === 'picked up') {
    return 'Your item has been picked up and will move to transit.';
  }

  if (status === 'in transit') {
    return 'Your item is on the way to the delivery area.';
  }

  if (status === 'delivery scheduling in progress') {
    return 'We are coordinating the delivery appointment.';
  }

  if (status === 'delivery scheduled') {
    return 'Your item will be delivered during the scheduled delivery window.';
  }

  if (status === 'delivered') {
    return 'Your order has been delivered.';
  }

  if (status === 'order canceled') {
    return 'No further tracking updates are expected for this order.';
  }

  return 'We will update this page when the next tracking milestone is available.';
}

function getMarker(state) {
  if (state === 'done') {
    return '\u2713';
  }

  if (state === 'current') {
    return '\u25cf';
  }

  return '';
}

function clearState() {
  result.classList.add('hidden');
  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
  timeline.replaceChildren();
}

function showMessage(message, isError) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', Boolean(isError));
}

function setLoading(isLoading) {
  trackButton.disabled = isLoading;
  trackButton.classList.toggle('loading', isLoading);
  trackButtonLabel.textContent = isLoading ? 'Checking...' : 'Track order';

  if (isLoading) {
    showMessage('Loading order status...', false);
  }
}
