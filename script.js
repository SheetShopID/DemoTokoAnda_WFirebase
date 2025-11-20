/**
 * Ambil ID sheet dari link export CSV
 * Contoh: https://docs.google.com/spreadsheets/d/abcd123/export?format=csv
 */
function extractSheetId(sheetUrl) {
  const m = sheetUrl.match(/\/spreadsheets\/d\/([^/]+)/);
  return m ? m[1] : null;
}

/******************************
 * STORAGE KEYS & STATE
 ******************************/
const STORAGE_PROFILES = 'jastip_profiles';       // Array of profiles
const STORAGE_CURRENT = 'jastip_current_profile'; // ID of current profile

let profiles = JSON.parse(localStorage.getItem(STORAGE_PROFILES) || '[]');
let currentProfileId = localStorage.getItem(STORAGE_CURRENT) || null;

let PRODUCTS = [];
let currentCategory = '';
let cart = JSON.parse(localStorage.getItem("jastip_cart") || "{}");

// DOM references
const productsEl = document.getElementById('products');
const cartDrawer = document.getElementById('cartdrawer');
const cartCount = document.getElementById('cartcount');
const subtitleEl = document.getElementById('subtitleEl');
const heroDescEl = document.getElementById('heroDesc');
const waLink = document.getElementById('waLink');
const logoEl = document.getElementById('logoEl');
const logoPreview = document.getElementById('logoPreview');

/******************************
 * HELPERS
 ******************************/
function formatRp(v) {
  if (isNaN(v)) return 'Rp0';
  return 'Rp' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9);
}

function saveProfiles() {
  localStorage.setItem(STORAGE_PROFILES, JSON.stringify(profiles));
}

function setCurrentProfile(id) {
  currentProfileId = id;
  if (id) localStorage.setItem(STORAGE_CURRENT, id);
  else localStorage.removeItem(STORAGE_CURRENT);
}

function getCurrentProfile() {
  return profiles.find(p => p.id === currentProfileId) || null;
}

/******************************
 * MODAL CONTROLS & PROFILE UI
 ******************************/
function openSetupModal() {
  renderProfilesList();
  const modal = document.getElementById('setupModal');
  modal.style.display = 'flex';
}

function closeSetupModal() {
  const modal = document.getElementById('setupModal');
  modal.style.display = 'none';
}

function renderProfilesList() {
  const listEl = document.getElementById('profilesList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (profiles.length === 0) {
    listEl.innerHTML =
      '<div class="small">Belum ada profil — buat profil baru dengan mengisi form di bawah.</div>';
    fillFormWithProfile(null);
    return;
  }

  profiles.forEach(p => {
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.innerHTML = `
      <div class="logo-preview" style="width:44px;height:44px">
        ${p.logo ? `<img width="44px" src="${p.logo}" alt="${p.name}">` : 'JS'}
      </div>
      <div style="flex:1">
        <div class="profile-name">${p.name}</div>
        <div class="profile-meta">${p.sheet ? p.sheet : ''}</div>
      </div>
      <div>
        <button class="btn-ghost" onclick="useProfile('${p.id}')">Pakai</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  // Fill form with current profile if exists
  const current = getCurrentProfile();
  fillFormWithProfile(current);
}

function useProfile(id) {
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  setCurrentProfile(id);
  applySetup(p);
  closeSetupModal();
  loadProducts();
}

/******************************
 * CART FUNCTIONS
 ******************************/
function addToCart(name, price, openNow = false) {
  if (!cart[name]) cart[name] = { name, price, qty: 0 };
  cart[name].qty++;
  saveCart();
  updateCartCount();   // <--- dipanggil di sini
  if (openNow) openCart();
}

function saveCart() {
  localStorage.setItem("jastip_cart", JSON.stringify(cart));
}

/******************************
 * Fungsi ini yang kamu cari
 ******************************/
function updateCartCount() {
  const totalQty = Object.values(cart).reduce((a, b) => a + b.qty, 0);
  cartCount.textContent = totalQty;
  cartCount.style.display = totalQty > 0 ? 'inline-block' : 'none';
}

function toggleCart() {
  document.getElementById('cartdrawer').classList.toggle('active');
  renderCart();
}

function openCart() {
  document.getElementById('cartdrawer').classList.add('active');
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartitems');
  const totalDiv = document.getElementById('carttotal');
  list.innerHTML = '';

  let total = 0;
  const items = Object.values(cart);
  if (items.length === 0) {
    document.getElementById('cartdrawer').classList.remove('active');
    return;
  }

  items.forEach(i => {
    const subtotal = i.price * i.qty;
    total += subtotal;
    list.innerHTML += `
      <div class="cart-item">
        <div class="cart-item-name">${escapeHtml(i.name)}<br><small>${formatRp(i.price)}</small></div>
        <div class="cart-controls">
          <button onclick="changeQty('${escapeJs(i.name)}', -1)">-</button>
          <span>${i.qty}</span>
          <button onclick="changeQty('${escapeJs(i.name)}', 1)">+</button>
          <button onclick="removeItem('${escapeJs(i.name)}')">❌</button>
        </div>
      </div>
    `;
  });

  totalDiv.textContent = 'Total: ' + formatRp(total);
}

function changeQty(name, delta) {
  if (!cart[name]) return;
  cart[name].qty += delta;
  if (cart[name].qty <= 0) delete cart[name];
  saveCart();
  renderCart();
  updateCartCount();
}

function removeItem(name) {
  delete cart[name];
  saveCart();
  renderCart();
  updateCartCount();
}

function fillFormWithProfile(p) {
  document.getElementById('inputNama').value = p ? p.name : '';
  document.getElementById('inputDeskripsi').value = p ? p.desc : '';
  document.getElementById('inputWA').value = p ? p.wa : '';
  document.getElementById('inputSheet').value = p ? p.sheet : '';
  document.getElementById('inputAccent').value =
    p && p.theme ? p.theme.accent || '#2f8f4a' : '#2f8f4a';
  document.getElementById('inputBg').value =
    p && p.theme ? p.theme.bg || '#f7f9f8' : '#f7f9f8';
  document.getElementById('inputCard').value =
    p && p.theme ? p.theme.card || '#ffffff' : '#ffffff';

  if (p && p.logo) {
    logoPreview.innerHTML = `<img src="${p.logo}" alt="logo" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    logoPreview.textContent = 'JS';
  }
}

/******************************
 * SAVE / DELETE PROFILE
 ******************************/
function validateSheetUrl(u) {
  try {
    if (!u) return false;
    const ok1 = u.includes('/spreadsheets/d/');
    const ok2 = u.includes('export?format=csv');
    return ok1 && ok2;
  } catch (e) {
    return false;
  }
}

// Handle logo file upload
document.getElementById('inputLogo').addEventListener('change', function (e) {
  const f = e.target.files[0];
  if (!f) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    logoPreview.innerHTML = `<img src="${ev.target.result}" alt="logo" style="width:100%;height:100%;object-fit:cover">`;
    document.getElementById('setupModal').dataset.logoData = ev.target.result;
  };
  reader.readAsDataURL(f);
});

function saveProfile() {
  const name = document.getElementById('inputNama').value.trim();
  const desc = document.getElementById('inputDeskripsi').value.trim();
  const wa = document.getElementById('inputWA').value.trim();
  const sheet = document.getElementById('inputSheet').value.trim();
  const accent = document.getElementById('inputAccent').value;
  const bg = document.getElementById('inputBg').value;
  const card = document.getElementById('inputCard').value;
  const logoData = document.getElementById('setupModal').dataset.logoData || null;

  if (!name || !desc || !wa || !sheet) {
    alert('Semua field (Nama, Deskripsi, WA, Sheet) wajib diisi.');
    return;
  }
  if (!validateSheetUrl(sheet)) {
    alert('Link Google Sheet tidak valid. Pastikan berformat export?format=csv dan berisi /spreadsheets/d/.');
    return;
  }

  // create or update profile
  let profile;
  if (currentProfileId) {
    profile = profiles.find(p => p.id === currentProfileId);
    if (profile) {
      profile.name = name;
      profile.desc = desc;
      profile.wa = wa;
      profile.sheet = sheet;
      profile.theme = { accent, bg, card };
      if (logoData) profile.logo = logoData;
    }
  }

  if (!profile) {
    profile = {
      id: uid(),
      name,
      desc,
      wa,
      sheet,
      theme: { accent, bg, card },
      logo: logoData || null,
      created: Date.now()
    };
    profiles.push(profile);
    setCurrentProfile(profile.id);
  }

  saveProfiles();
  applySetup(profile);
  renderProfilesList();
  closeSetupModal();
  loadProducts();
  delete document.getElementById('setupModal').dataset.logoData;
}

function deleteCurrentProfile() {
  if (!currentProfileId) {
    alert('Pilih profil untuk dihapus (klik "Pakai" di daftar profil lalu buka pengaturan lagi).');
    return;
  }
  const ok = confirm('Yakin hapus profil ini? Tindakan ini tidak bisa dibatalkan.');
  if (!ok) return;

  profiles = profiles.filter(p => p.id !== currentProfileId);
  saveProfiles();
  setCurrentProfile(null);
  applyDefaultTheme();
  renderProfilesList();
  closeSetupModal();
  productsEl.innerHTML = '';
}

function resetProfiles() {
  if (!confirm('Reset semua profil dan pengaturan?')) return;

  profiles = [];
  saveProfiles();
  setCurrentProfile(null);
  applyDefaultTheme();
  renderProfilesList();
  closeSetupModal();
  productsEl.innerHTML = '';
  alert('Semua profil direset.');
}

/******************************
 * FORM WIZARD NAVIGATION
 ******************************/
let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
  document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
  document.querySelector(`.wizard-step[data-step="${step}"]`).style.display = 'block';

  // kontrol tombol
  document.getElementById('prevBtn').style.visibility = step === 1 ? 'hidden' : 'visible';
  document.getElementById('nextBtn').style.display = step < totalSteps ? 'inline-block' : 'none';
  document.getElementById('saveBtn').style.display = step === totalSteps ? 'inline-block' : 'none';
}

function nextStep() {
  if (currentStep < totalSteps) {
    currentStep++;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
}

// jalankan saat modal dibuka
const originalOpen = openSetupModal;
openSetupModal = function() {
  originalOpen(); // jalankan fungsi asli
  currentStep = 1;
  showStep(currentStep);
};


/******************************
 * APPLY SETUP (THEME, TEXT, WA)
 ******************************/
function applySetup(profile) {
  if (!profile) return;

  // Theme
  try {
    if (profile.theme) {
      document.documentElement.style.setProperty('--accent', profile.theme.accent || '#2f8f4a');
      document.documentElement.style.setProperty('--bg', profile.theme.bg || '#f7f9f8');
      document.documentElement.style.setProperty('--card', profile.theme.card || '#ffffff');
    }
  } catch (e) { }

  // Logo
  if (profile.logo) {
    logoEl.innerHTML = `<img width="50px" src="${profile.logo}" alt="${profile.name}">`;
  } else {
    logoEl.textContent = profile.name ? profile.name.slice(0, 2).toUpperCase() : 'JS';
  }

  // Texts
  subtitleEl.textContent = profile.name || '';
  heroDescEl.textContent = profile.desc || '';

  // WhatsApp
  waLink.href = `https://wa.me/${profile.wa}`;

  // Footer
  document.getElementById('footerText').textContent =
    `${profile.name} • Jadwal: Senin–Jumat • Order cutoff 16:00`;
}

function applyDefaultTheme() {
  document.documentElement.style.setProperty('--accent', '#2f8f4a');
  document.documentElement.style.setProperty('--bg', '#f7f9f8');
  document.documentElement.style.setProperty('--card', '#ffffff');

  logoEl.textContent = 'JS';
  subtitleEl.textContent = 'Skincare & Bodycare — Fee Rp10.000/item';
  heroDescEl.textContent =
    'Order sebelum 16:00, saya belanja sore ini dan sampai Cilejit malamnya. Free kemasan rapi.';
  waLink.href = '#';
  document.getElementById('footerText').textContent =
    'Jastip • Jadwal: Senin–Jumat • Order cutoff 16:00';
}

/******************************
 * PRODUCTS & CATEGORY
 ******************************/
function loadProducts() {
  const profile = getCurrentProfile();
  if (!profile) {
    alert('Pilih atau buat profil terlebih dahulu.');
    return;
  }

  const SHEET_URL = profile.sheet;
  fetch(SHEET_URL)
    .then(res => {
      if (!res.ok) throw new Error('Fetch gagal');
      return res.text();
    })
    .then(csv => {
      const rows = csv.split("\n").slice(1).map(r => r.trim()).filter(Boolean);
      PRODUCTS = rows.map(r => {
        // Simple CSV parsing (assuming no commas in fields)
        const parts = r.split(",");
       const [name,shop,price,img,fee,category,promo,stock] = parts;
        return { 
          id: Math.random(),
          name: name ? name.trim() : '',
          shop: shop ? shop.trim() : '',
          price: +(price || 0),
          img: img ? img.trim() : '',
          fee: +(fee || 0),
          category: category ? category.trim() : '',
          promo: (promo || '').trim().toLowerCase(),
          stock: isNaN(stock) ? 0 : +stock
        };

      }).filter(p => p.name);

      populateCategories();
      renderProducts();
    })
    .catch(err => {
      console.error(err);
      alert('Gagal memuat data dari Google Sheet. Pastikan link CSV valid dan dapat diakses (share: anyone with link).');
    });
}
function populateCategories() {
  const filtersEl = document.getElementById('categoryFilters');
  filtersEl.innerHTML = '<div class="chip active" onclick="filterCategory(\'\')">Semua</div>';

  const cats = [...new Set(PRODUCTS.map(p => p.category))].filter(Boolean);
  cats.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.onclick = () => filterCategory(cat);
    filtersEl.appendChild(chip);
  });
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));

  const selected = [...document.querySelectorAll('.chip')].find(c => c.textContent === cat);
  if (selected) selected.classList.add('active');
  else document.querySelector('.chip:first-child').classList.add('active');

  renderProducts();
}

function renderProducts() {
  productsEl.innerHTML = '';

  PRODUCTS.filter(p => !currentCategory || p.category === currentCategory)
    .forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';

      const imgPart = p.img
        ? `<img src="${p.img}" alt="${p.name}">`
        : `<div style="padding:8px;text-align:center;color:var(--muted)">${p.shop}</div>`;

      card.innerHTML = `
        <div class="img">${imgPart}</div>
        <div class="pname">${escapeHtml(p.name)}</div>
        <div class="shop">${escapeHtml(p.shop)}</div>
        <div class="price">${formatRp(p.price)} + Fee ${formatRp(p.fee)}</div>
        <div class="stock">Stok: ${p.stock}</div>
        <button class="btn add" onclick="addToCart('${escapeJs(p.name)}', ${p.price + p.fee})">+ Titip</button>
        <button class="btn quick" onclick="addToCart('${escapeJs(p.name)}', ${p.price + p.fee}, true)">Beli Cepat</button>
      `;

      productsEl.appendChild(card);
    });

  updateCartCount();
}

/******************************
 * ESCAPE HELPERS
 ******************************/
function escapeJs(s) {
  return (s || '').replace(/'/g, "\\'").replace(/\n/g, " ");
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
}

/******************************
 * MINIMIZE CART DRAWER
 ******************************/
function minimizeCart() {
  const drawer = document.getElementById('cartdrawer');
  drawer.classList.remove('active'); // hide drawer
}

const cart = JSON.parse(localStorage.getItem("jastip_cart") || "{}");
  console.log(cart);
  const profile = {
    name: localStorage.getItem("jastip_profile_name"),
    wa: localStorage.getItem("jastip_profile_wa"),
    sheet: localStorage.getItem("jastip_profile_sheet")
  };
/******************************
 * CHECKOUT FUNCTION — Terhubung ke Google Sheet
 ******************************/
async function checkout(cart, profile) {
  if (!cart || Object.keys(cart).length === 0) {
    alert("Keranjang masih kosong!");
    return;
  }

  // Ambil ID Sheet
  const sheetId = extractSheetId(profile.sheet);
  const items = Object.values(cart);
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Siapkan data order
  const orderData = {
    sheetId,
    profileName: profile.name,
    wa: profile.wa,
    items,
    total,
    timestamp: new Date().toISOString()
  };

  try {
    // Simpan ke Firebase
    const newOrderRef = db.ref("orders").push();
    await newOrderRef.set(orderData);
    console.log("✅ Order tersimpan di Firebase:", newOrderRef.key);

    // Kosongkan cart
    localStorage.removeItem("jastip_cart");

    // Kirim ke WhatsApp
    const msg = [
      "Halo, saya mau titip:",
      ...items.map(i => `- ${i.name} (${i.qty}x Rp${i.price.toLocaleString()})`),
      "",
      `Total: Rp${total.toLocaleString()}`,
      "",
      "_Silakan konfirmasi pembayaran setelah pesan dikirim._"
    ].join("\n");

    window.open(`https://wa.me/${profile.wa}?text=${encodeURIComponent(msg)}`, "_blank");

    alert("✅ Pesanan terkirim & disimpan di Firebase!");
  } catch (err) {
    console.error("❌ Gagal menyimpan ke Firebase:", err);
    alert("❌ Pesanan gagal disimpan ke Firebase.");
  }
}
 

// END CHECKOUT
// contoh pemanggilan (kamu tinggal panggil di kode kamu)
window.runCheckout = () => {
  const cart = JSON.parse(localStorage.getItem("jastip_cart") || "{}");
  console.log(cart);
  const profile = {
    name: localStorage.getItem("jastip_profile_name"),
    wa: localStorage.getItem("jastip_profile_wa"),
    sheet: localStorage.getItem("jastip_profile_sheet")
  };
  checkout(cart, profile);
};
/******************************
 * INIT ON LOAD
 ******************************/
window.addEventListener('load', function () {
  // Apply current profile if exists
  if (profiles.length > 0 && currentProfileId) {
    const p = getCurrentProfile();
    if (p) applySetup(p);
  }

  // If no profiles, open setup modal
  if (profiles.length === 0) {
    openSetupModal();
  } else {
    // Load products if profile exists
    if (currentProfileId) loadProducts();
  }

  updateCartCount();
});

/******************************
 * EXPOSE FUNCTIONS GLOBALLY
 ******************************/
window.openSetupModal = openSetupModal;
window.closeSetupModal = closeSetupModal;
window.saveProfile = saveProfile;
window.deleteCurrentProfile = deleteCurrentProfile;
window.resetProfiles = resetProfiles;
window.filterCategory = filterCategory;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.changeQty = changeQty;
window.removeItem = removeItem;
window.checkout = checkout;
window.useProfile = useProfile;

