/* ═══════════════════════════════════════════════════════════════════════
   FLAVOUR DASH – Frontend Logic
   ═══════════════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────────────────
let menu = {};
let cart = [];
let activeCategory = "pizza";

// ─── DOM Refs ───────────────────────────────────────────────────────────
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const menuGrid       = $("#menu-grid");
const categoryTabs   = $("#category-tabs");
const cartSidebar    = $("#cart-sidebar");
const cartOverlay    = $("#cart-overlay");
const cartItemsList  = $("#cart-items");
const cartCount      = $("#cart-count");
const cartSubtotal   = $("#cart-subtotal");
const cartTax        = $("#cart-tax");
const cartTotal      = $("#cart-total");
const checkoutBtn    = $("#checkout-btn");
const modalOverlay   = $("#modal-overlay");
const checkoutForm   = $("#checkout-form");
const orderResult    = $("#order-result");
const toastContainer = $("#toast-container");
const navbar         = $(".navbar");

// ─── Init ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  fetchMenu();
  bindNavbar();
  bindCart();
  bindModal();
});

// ─── Fetch Menu from API ────────────────────────────────────────────────
async function fetchMenu() {
  showSkeletons();
  try {
    const res = await fetch("/api/menu");
    menu = await res.json();
    renderCategoryTabs();
    renderMenuItems(activeCategory);
  } catch (err) {
    console.error("Failed to fetch menu:", err);
    menuGrid.innerHTML = `<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">
      Failed to load menu. Please refresh the page.</p>`;
  }
}

// ─── Skeleton Loader ────────────────────────────────────────────────────
function showSkeletons() {
  menuGrid.innerHTML = Array(4)
    .fill('<div class="skeleton skeleton-card"></div>')
    .join("");
}

// ─── Category Tabs ──────────────────────────────────────────────────────
const categoryEmojis = {
  pizza: "🍕", burgers: "🍔", sushi: "🍣", desserts: "🍰", drinks: "🥤"
};

function renderCategoryTabs() {
  categoryTabs.innerHTML = Object.keys(menu)
    .map(cat => `
      <button class="cat-tab ${cat === activeCategory ? 'active' : ''}"
              data-category="${cat}" id="tab-${cat}">
        <span class="tab-emoji">${categoryEmojis[cat] || "🍽️"}</span>
        ${capitalize(cat)}
      </button>`)
    .join("");

  $$(".cat-tab", categoryTabs).forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      $$(".cat-tab", categoryTabs).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderMenuItems(activeCategory);
    });
  });
}

// ─── Render Menu Items ──────────────────────────────────────────────────
function renderMenuItems(category) {
  const items = menu[category] || [];
  menuGrid.innerHTML = items
    .map((item, i) => `
      <div class="food-card" style="animation-delay:${i * .08}s" id="food-card-${item.id}">
        ${item.popular ? '<span class="popular-badge">🔥 Popular</span>' : ''}
        <div class="food-emoji">${item.image}</div>
        <div class="food-info">
          <h3 class="food-name">${item.name}</h3>
          <p class="food-desc">${item.desc}</p>
          <div class="food-meta">
            <span class="food-price">$${item.price.toFixed(2)}</span>
            <span class="food-rating">⭐ ${item.rating}</span>
          </div>
          <button class="add-to-cart-btn" data-id="${item.id}"
                  id="add-btn-${item.id}" onclick="addToCart(${item.id})">
            <span>＋</span> Add to Cart
          </button>
        </div>
      </div>`)
    .join("");
}

// ─── Cart Logic ─────────────────────────────────────────────────────────
function addToCart(id) {
  const item = findItem(id);
  if (!item) return;

  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  updateCartUI();
  showToast(`${item.name} added to cart!`, "✅");

  // Brief "added" animation on button
  const btn = $(`#add-btn-${id}`);
  if (btn) {
    btn.classList.add("added");
    btn.innerHTML = "✓ Added";
    setTimeout(() => {
      btn.classList.remove("added");
      btn.innerHTML = '<span>＋</span> Add to Cart';
    }, 1200);
  }
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) return removeFromCart(id);
  updateCartUI();
}

function updateCartUI() {
  // Badge
  const total = cart.reduce((s, c) => s + c.qty, 0);
  cartCount.textContent = total;
  cartCount.classList.toggle("show", total > 0);

  // Items list
  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="cart-empty">
        <span class="cart-empty-icon">🛒</span>
        <p class="cart-empty-text">Your cart is empty.<br>Add some delicious items!</p>
      </div>`;
    checkoutBtn.disabled = true;
  } else {
    cartItemsList.innerHTML = cart
      .map(item => `
        <div class="cart-item" id="cart-item-${item.id}">
          <span class="cart-item-emoji">${item.image}</span>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
          <button class="remove-item" onclick="removeFromCart(${item.id})" title="Remove">✕</button>
        </div>`)
      .join("");
    checkoutBtn.disabled = false;
  }

  // Totals
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = subtotal * 0.08;
  const grand = subtotal + tax;
  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartTax.textContent      = `$${tax.toFixed(2)}`;
  cartTotal.textContent    = `$${grand.toFixed(2)}`;
}

// ─── Cart Open / Close ──────────────────────────────────────────────────
function bindCart() {
  $$("#open-cart").forEach(el => el.addEventListener("click", openCart));
  $("#close-cart").addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  updateCartUI();
}

function openCart() {
  cartSidebar.classList.add("open");
  cartOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  cartSidebar.classList.remove("open");
  cartOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── Modal / Checkout ───────────────────────────────────────────────────
function bindModal() {
  checkoutBtn.addEventListener("click", openCheckout);
  $("#close-modal").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", e => {
    if (e.target === modalOverlay) closeModal();
  });
  checkoutForm.addEventListener("submit", placeOrder);
}

function openCheckout() {
  closeCart();
  orderResult.classList.add("hidden");
  checkoutForm.classList.remove("hidden");
  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = $(".place-order-btn");
  btn.disabled = true;
  btn.textContent = "Placing Order…";

  const data = {
    name:    $("#input-name").value.trim(),
    email:   $("#input-email").value.trim(),
    phone:   $("#input-phone").value.trim(),
    address: $("#input-address").value.trim(),
    items:   cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
  };

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (res.ok) {
      // Show success
      checkoutForm.classList.add("hidden");
      $("#success-order-id").textContent = `Order #${json.order.id}`;
      $("#success-total").textContent    = `$${json.order.total.toFixed(2)}`;
      orderResult.classList.remove("hidden");

      // Clear cart
      cart = [];
      updateCartUI();
      checkoutForm.reset();
    } else {
      alert(json.error || "Something went wrong");
    }
  } catch (err) {
    console.error(err);
    alert("Network error. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Place Order 🚀";
  }
}

// ─── Navbar Scroll Effect ───────────────────────────────────────────────
function bindNavbar() {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 30);
  });

  // Mobile hamburger
  const hamburger = $(".hamburger");
  const navLinks  = $(".nav-links");
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("mobile-open");
    });
  }

  // Smooth scroll for nav links
  $$(".nav-links a[href^='#']").forEach(a => {
    a.addEventListener("click", e => {
      navLinks.classList.remove("mobile-open");
    });
  });
}

// ─── Toast Notifications ────────────────────────────────────────────────
function showToast(message, icon = "ℹ️") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Helpers ────────────────────────────────────────────────────────────
function findItem(id) {
  for (const cat of Object.values(menu)) {
    const item = cat.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Scroll-reveal animation ────────────────────────────────────────────
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  },
  { threshold: 0.1 }
);

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    $$(".step-card").forEach(el => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "all .6s var(--ease-out)";
      observer.observe(el);
    });
  }, 200);
});
