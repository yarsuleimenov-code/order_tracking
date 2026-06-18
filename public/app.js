const TRACKING_API_URL = 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE/track-order';

const form = document.querySelector('#tracking-form');
const orderIdInput = document.querySelector('#order-id');
const phoneLast4Input = document.querySelector('#phone-last4');
const trackButton = document.querySelector('#track-button');
const statusMessage = document.querySelector('#status-message');
const result = document.querySelector('#result');

const resultOrder = document.querySelector('#result-order');
const currentStatus = document.querySelector('#current-status');
const statusDescription = document.querySelector('#status-description');
const pickupDate = document.querySelector('#pickup-date');
const pickupWindow = document.querySelector('#pickup-window');
const deliveryDate = document.querySelector('#delivery-date');
const deliveryWindow = document.querySelector('#delivery-window');
const lastUpdated = document.querySelector('#last-updated');
const timeline = document.querySelector('#timeline');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const orderId = orderIdInput.value.trim();
  const phoneLast4 = phoneLast4Input.value.trim();

  clearState();

  if (!orderId) {
    showMessage('Please enter your Order ID.', true);
    return;
  }

  if (!/^\d{4}$/.test(phoneLast4)) {
    showMessage('Please enter exactly 4 phone digits.', true);
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
        phone_last4: phoneLast4,
      }),
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const data = await response.json();
    renderResponse(data);
  } catch (error) {
    showMessage('We could not load your order right now. Please try again later.', true);
  } finally {
    setLoading(false);
  }
});

function renderResponse(data) {
  if (!data || data.found === false) {
    showMessage('Order was not found. Please check your Order ID.', true);
    return;
  }

  if (data.verified === false) {
    showMessage('The phone digits do not match this order.', true);
    return;
  }

  resultOrder.textContent = `Order #${data.order_id || ''}`;
  currentStatus.textContent = data.client_status || 'Order status is being updated';
  statusDescription.textContent = data.status_description || '';
  pickupDate.textContent = data.pickup_date || 'Not scheduled yet';
  pickupWindow.textContent = data.pickup_window || 'Not scheduled yet';
  deliveryDate.textContent = data.delivery_date || 'Not scheduled yet';
  deliveryWindow.textContent = data.delivery_window || 'Not scheduled yet';
  lastUpdated.textContent = data.last_updated || 'Not scheduled yet';
  renderTimeline(Array.isArray(data.timeline) ? data.timeline : []);

  statusMessage.textContent = '';
  statusMessage.classList.remove('error');
  result.classList.remove('hidden');
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
    label.textContent = item.label || '';

    row.append(marker, label);
    timeline.append(row);
  });
}

function getMarker(state) {
  if (state === 'done') {
    return '✓';
  }

  if (state === 'current') {
    return '●';
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
  trackButton.textContent = isLoading ? 'Loading...' : 'Track order';

  if (isLoading) {
    showMessage('Loading order status...', false);
  }
}
