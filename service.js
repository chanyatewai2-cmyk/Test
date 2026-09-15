'use strict';

const auth = window.firebaseAuth || firebase.auth();
const db = window.firebaseDB || firebase.firestore();

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US').format(Math.max(0, Number(n) || 0));

let currentUser = null;
let userBalance = 0;
let allCategories = [];
let allServices = [];
let selectedCategoryId = '';
let selectedService = null;

/* ============ Toast ============ */
function showToast(message, type = 'error') {
  const toast = $('toast');
  $('toastText').textContent = message;
  toast.className = 'toast show ' + type;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.className = 'toast', 3300);
}

/* ============ Menu ============ */
function setMenu(open) {
  $('menu').classList.toggle('active', open);
  $('menuOverlay').classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function closeDropdowns() {
  $('categoryList').classList.add('hidden');
  $('serviceList').classList.add('hidden');
  $('categoryButton').classList.remove('open');
  $('serviceButton').classList.remove('open');
}

/* ============ User ============ */
function updateBalance() {
  const value = '$' + Number(userBalance || 0).toFixed(2);
  $('balanceAmount').textContent = value;
  $('balanceHint').textContent = value;
}

function updateProfile(user) {
  const name = user.displayName || user.email || 'User';
  $('profileInitial').textContent = name.charAt(0).toUpperCase();
  $('userName').textContent = user.displayName || user.email?.split('@')[0] || 'User';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

async function loadUser() {
  const ref = await db.collection('users').doc(currentUser.uid).get();

  if (ref.exists) {
    const data = ref.data() || {};
    userBalance = Number(data.balance ?? data.dollars ?? 0);
  } else {
    userBalance = 0;
    await db.collection('users').doc(currentUser.uid).set({
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'User',
      balance: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  updateBalance();
}

/* ============ Data loading ============ */
async function loadServices() {
  try {
    const [categorySnap, serviceSnap] = await Promise.all([
      db.collection('categories').get(),
      db.collection('services').where('active', '==', true).get()
    ]);

    allCategories = [];
    categorySnap.forEach(doc => {
      const d = doc.data() || {};
      allCategories.push({
        docId: doc.id,
        id: d.id || doc.id,
        name: d.name || doc.id,
        icon: d.icon || '',
        sortOrder: Number(d.sortOrder) || 99
      });
    });

    allCategories.sort((a, b) =>
      a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );

    allServices = [];
    serviceSnap.forEach(doc => {
      const d = doc.data() || {};
      allServices.push({
        docId: doc.id,
        id: String(d.id ?? doc.id),
        name: d.name || 'Unnamed Service',
        category: d.category || '',
        note: d.note || '',
        estimatedTime: d.estimated_time || d.averageTime || d.estimatedTime || '',
        min: Number(d.min_qty ?? d.min ?? 1),
        max: Number(d.max_qty ?? d.max ?? 100000),
        // Support records created by both the old admin form (`price`) and
        // the newer API-style field (`rate_per_1k`).
        rate: Number(d.rate_per_1k ?? d.price ?? d.rate ?? 0),
        active: d.active !== false
      });
    });

    $('serviceCount').textContent = allServices.length + ' active';
    renderCategories();

    if (allCategories.length) {
      selectCategory(allCategories[0].id);
    } else {
      clearServiceState('No categories are available yet.');
    }
  } catch (error) {
    console.error(error);
    showToast('Could not load services: ' + error.message);
  }
}

/* ============ Category render/select ============ */
function renderCategories() {
  const list = $('categoryList');
  list.innerHTML = '';

  if (!allCategories.length) {
    list.innerHTML = '<div class="empty">No categories found.</div>';
    return;
  }

  allCategories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'option';
    item.innerHTML = `
      <b>${escapeHtml(category.name)}</b>
      <small>${allServices.filter(s => s.category === category.id).length} active services</small>
    `;
    item.addEventListener('click', () => selectCategory(category.id));
    list.appendChild(item);
  });
}

function renderServices() {
  const list = $('serviceList');
  list.innerHTML = '';

  const services = allServices.filter(s => s.category === selectedCategoryId);

  if (!services.length) {
    list.innerHTML = '<div class="empty">No active services in this category.</div>';
    return;
  }

  services.forEach(service => {
    const item = document.createElement('div');
    item.className = 'option';
    item.innerHTML = `
      <b>${escapeHtml(service.id)} — ${escapeHtml(service.name)}</b>
      <small>${money(service.rate)} Ks / 1K • ${money(service.min)} - ${money(service.max)}</small>
    `;
    item.addEventListener('click', () => selectService(service));
    list.appendChild(item);
  });
}

function resetOrderFields() {
  selectedService = null;
  $('serviceLabel').textContent = 'Select a service';
  $('serviceLabel').classList.add('placeholder');
  $('serviceNote').textContent = 'Select a service to view its details.';
  $('serviceMinMax').textContent = 'Min: 0 • Max: 0';
  $('quantityHint').textContent = 'Select a service first';
  $('timeLine').classList.add('hidden');
  $('quantityInput').value = '';
  $('quickButtons').innerHTML = '';
  $('calculatedPrice').textContent = '0';
  $('orderBtn').disabled = true;
}

function selectCategory(id) {
  selectedCategoryId = id;
  const category = allCategories.find(c => c.id === id);

  $('categoryLabel').textContent = category?.name || id;
  $('categoryLabel').classList.remove('placeholder');

  resetOrderFields();
  renderServices();
  closeDropdowns();
}

function selectService(service) {
  selectedService = service;

  $('serviceLabel').textContent = service.id + ' — ' + service.name;
  $('serviceLabel').classList.remove('placeholder');

  $('serviceNote').textContent = service.note || 'No additional note.';
  $('serviceMinMax').textContent =
    'Min: ' + money(service.min) + ' • Max: ' + money(service.max);
  $('quantityHint').textContent =
    money(service.min) + ' — ' + money(service.max);

  if (service.estimatedTime) {
    $('serviceTime').textContent = service.estimatedTime;
    $('timeLine').classList.remove('hidden');
  } else {
    $('timeLine').classList.add('hidden');
  }

  renderQuickButtons();
  calculateCost();
  closeDropdowns();
}

function clearServiceState(message) {
  selectedCategoryId = '';
  selectedService = null;
  $('categoryLabel').textContent = 'No categories available';
  $('categoryLabel').classList.add('placeholder');
  $('serviceLabel').textContent = 'Unavailable';
  $('serviceNote').textContent = message;
  $('serviceMinMax').textContent = 'Min: 0 • Max: 0';
  $('quantityHint').textContent = 'Unavailable';
  $('orderBtn').disabled = true;
}

/* ============ Quick buttons ============ */
function renderQuickButtons() {
  const wrap = $('quickButtons');
  wrap.innerHTML = '';
  if (!selectedService) return;

  const min = selectedService.min;
  const max = selectedService.max;
  const candidates = [min, 100, 500, 1000, 5000, 10000, 50000];

  const values = [...new Set(
    candidates.filter(n => n >= min && n <= max)
  )];

  values.forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = money(value);
    btn.addEventListener('click', () => {
      $('quantityInput').value = value;
      calculateCost();
    });
    wrap.appendChild(btn);
  });
}

/* ============ Cost calc ============ */
function calculateCost() {
  if (!selectedService) {
    $('calculatedPrice').textContent = '0';
    $('orderBtn').disabled = true;
    return;
  }

  const qty = Number($('quantityInput').value || 0);
  const cost = Math.round((qty / 1000) * selectedService.rate);

  $('calculatedPrice').textContent = money(cost);

  const valid =
    Number.isFinite(qty) &&
    qty >= selectedService.min &&
    qty <= selectedService.max &&
    cost > 0 &&
    cost <= userBalance;

  $('orderBtn').disabled = !valid;
}

/* ============ Order placement ============ */
async function placeOrder() {
  if (!currentUser || !selectedService) return;

  const link = $('linkInput').value.trim();
  const quantity = Number($('quantityInput').value);
  const totalCost = Math.round((quantity / 1000) * selectedService.rate);

  if (!/^https?:\/\//i.test(link)) {
    showToast('Please enter a valid HTTP/HTTPS link.');
    return;
  }

  if (!Number.isFinite(quantity) ||
      quantity < selectedService.min ||
      quantity > selectedService.max) {
    showToast(
      'Quantity must be between ' +
      money(selectedService.min) + ' and ' +
      money(selectedService.max) + '.'
    );
    return;
  }

  if (totalCost <= 0) {
    showToast('Order cost is invalid.');
    return;
  }

  if (totalCost > userBalance) {
    showToast('Insufficient balance. Please add funds first.');
    return;
  }

  $('loading').classList.add('show');
  $('orderBtn').disabled = true;

  try {
    const orderId = 'ZB' + Date.now().toString(36).toUpperCase();
    const category = allCategories.find(c => c.id === selectedCategoryId);

    // The previous add-then-update flow allowed two simultaneous browser
    // submissions to spend the same balance. Transaction keeps both writes
    // consistent and re-checks the authoritative balance on the server.
    const userRef = db.collection('users').doc(currentUser.uid);
    const orderRef = db.collection('orders').doc(orderId);
    await db.runTransaction(async transaction => {
      const userSnap = await transaction.get(userRef);
      const freshBalance = Number(userSnap.exists ? userSnap.data().balance : 0);
      if (!Number.isFinite(freshBalance) || freshBalance < totalCost) {
        throw new Error('Insufficient balance. Please add funds first.');
      }
      transaction.set(orderRef, {
        orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: currentUser.displayName || 'User',
        serviceName: selectedService.name,
        serviceId: selectedService.id,
        serviceCategory: selectedCategoryId,
        categoryName: category?.name || selectedCategoryId,
        link,
        quantity,
        totalCost,
        amount: totalCost,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      transaction.set(userRef, { balance: freshBalance - totalCost }, { merge: true });
      userBalance = freshBalance - totalCost;
    });

    updateBalance();

    $('linkInput').value = '';
    $('quantityInput').value = '';
    $('calculatedPrice').textContent = '0';

    showToast('Order placed successfully • #' + orderId, 'success');
  } catch (error) {
    console.error(error);
    showToast('Order failed: ' + error.message);
  } finally {
    $('loading').classList.remove('show');
    calculateCost();
  }
}

/* ============ Navigation ============ */
$('backBtn').addEventListener('click', () => location.href = 'index.html');
$('profileBtn').addEventListener('click', () =>
  setMenu(!$('menu').classList.contains('active'))
);
$('menuOverlay').addEventListener('click', () => setMenu(false));

$('dashboardLink').addEventListener('click', () => location.href = 'index.html');
$('addFundsLink').addEventListener('click', () => location.href = 'coins.html');
$('orderHistoryLink').addEventListener('click', () => location.href = 'history.html');
$('botPanelLink').addEventListener('click', () => location.href = 'panel.html');

$('logoutLink').addEventListener('click', async () => {
  try {
    await auth.signOut();
    location.href = 'login.html';
  } catch (error) {
    showToast('Logout failed.');
  }
});

/* ============ Dropdown events ============ */
$('categoryButton').addEventListener('click', event => {
  event.stopPropagation();
  const isHidden = $('categoryList').classList.contains('hidden');
  closeDropdowns();
  if (isHidden) {
    $('categoryList').classList.remove('hidden');
    $('categoryButton').classList.add('open');
  }
});

$('serviceButton').addEventListener('click', event => {
  event.stopPropagation();

  if (!selectedCategoryId) {
    showToast('Please select a category first.');
    return;
  }

  const isHidden = $('serviceList').classList.contains('hidden');
  closeDropdowns();
  if (isHidden) {
    $('serviceList').classList.remove('hidden');
    $('serviceButton').classList.add('open');
  }
});

document.addEventListener('click', event => {
  if (!$('categoryWrap').contains(event.target) &&
      !$('serviceWrap').contains(event.target)) {
    closeDropdowns();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setMenu(false);
    closeDropdowns();
  }
});

$('quantityInput').addEventListener('input', calculateCost);
$('orderBtn').addEventListener('click', placeOrder);

/* ============ Auth ============ */
auth.onAuthStateChanged(async user => {
  if (!user) {
    location.href = 'login.html';
    return;
  }

  currentUser = user;
  updateProfile(user);

  try {
    await loadUser();
    await loadServices();
  } catch (error) {
    console.error(error);
    showToast('Initialization failed: ' + error.message);
  }
});
