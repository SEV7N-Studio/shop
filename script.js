// Shared logic to manage orders between Cashier.html and Screen.html via localStorage
(function () {
  const STORAGE_KEY = 'ordersDataV1';

  // --- Storage helpers ---
  function loadOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data; // backward compatibility if it was an array
      if (Array.isArray(data?.orders)) return data.orders;
      return [];
    } catch (_) {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders }));
  }

  function upsertOrder(id, status) {
    const orders = loadOrders();
    const idx = orders.findIndex(o => String(o.id).toUpperCase() === String(id).toUpperCase());
    if (idx >= 0) {
      orders[idx].status = status;
    } else {
      orders.push({ id, status });
    }
    saveOrders(orders);
  }

  function removeOrder(id) {
    const orders = loadOrders().filter(o => String(o.id).toUpperCase() !== String(id).toUpperCase());
    saveOrders(orders);
  }

  // --- Screen page rendering (PREPAIRING / SERVING lists) ---
  function renderScreen() {
    const preContainer = document.getElementById('prepairing');
    const servContainer = document.getElementById('serving');
    if (!preContainer && !servContainer) return; // Not on Screen page

    // Clear existing listCard entries
    const clearCards = (container) => {
      if (!container) return;
      Array.from(container.querySelectorAll('.listCard')).forEach(c => c.remove());
    };
    clearCards(preContainer);
    clearCards(servContainer);

    const orders = loadOrders();
    orders.forEach(o => {
      const card = document.createElement('div');
      card.className = 'listCard';
      const h2 = document.createElement('h2');
      h2.textContent = `ORDER #${o.id}`;
      card.appendChild(h2);
      if (String(o.status).toLowerCase() === 'serving') {
        if (servContainer) servContainer.appendChild(card);
      } else {
        // Default/fallback to prepairing
        if (preContainer) preContainer.appendChild(card);
      }
    });
  }

  // --- Cashier page rendering (ordersCashier cards) ---
  function createCashierCard(order) {
    const card = document.createElement('div');
    card.className = 'ordersCashier';

    const title = document.createElement('h2');
    title.textContent = `ORDER #${order.id}`;

    const status = document.createElement('p');
    status.textContent = String(order.status).toLowerCase() === 'serving' ? 'Serving' : 'Prepairing';

    const receiveBtn = document.createElement('button');
    receiveBtn.textContent = 'For Receive';
    receiveBtn.className = 'forReceiveBtn';

    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done';
    doneBtn.className = 'doneBtn';

    card.appendChild(title);
    card.appendChild(status);
    card.appendChild(receiveBtn);
    card.appendChild(doneBtn);

    // Button behaviors
    receiveBtn.addEventListener('click', function () {
      // Move to SERVING
      upsertOrder(order.id, 'serving');
      status.textContent = 'Serving';
      renderScreen();
    });

    doneBtn.addEventListener('click', function () {
      // Remove this order everywhere
      removeOrder(order.id);
      card.remove();
      renderScreen();
    });

    return card;
  }

  function renderCashier() {
    const ordersList = document.getElementById('odersList'); // note: id is 'odersList' in HTML
    if (!ordersList) return; // Not on Cashier page

    // Clear existing cashier cards
    Array.from(ordersList.querySelectorAll('.ordersCashier')).forEach(c => c.remove());

    // Render from storage
    const orders = loadOrders();
    orders.forEach(o => {
      ordersList.appendChild(createCashierCard(o));
    });
  }

  // --- Cashier submit handler ---
  const inputBox = document.getElementById('orderNumber');
  const submitButton = document.getElementById('submitBtn');

  if (submitButton && inputBox) {
    submitButton.addEventListener('click', function (e) {
      e.preventDefault();
      const value = (inputBox.value || '').trim();

      if (!value) {
        alert('Please enter an order number.');
        inputBox.focus();
        return;
      }

      // Prevent duplicates (case-insensitive)
      const exists = loadOrders().some(o => String(o.id).toUpperCase() === value.toUpperCase());
      if (exists) {
        alert('This order already exists in the list.');
        return;
      }

      // New orders start in Prepairing
      upsertOrder(value, 'prepairing');

      // Add to cashier UI
      const ordersList = document.getElementById('odersList');
      if (ordersList) {
        ordersList.appendChild(createCashierCard({ id: value, status: 'prepairing' }));
      }

      // Update the Screen page (if open in another tab, it will react to storage event)
      renderScreen();

      // Clear input for next entry
      inputBox.value = '';
      inputBox.focus();
    });
  }

  // Initial render for whichever page this is
  renderCashier();
  renderScreen();

  // Sync changes coming from other tabs/windows
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) {
      renderScreen();
      renderCashier();
    }
  });
})();
