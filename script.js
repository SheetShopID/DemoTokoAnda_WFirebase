/******************************
 * UTILS
 ******************************/
const Utils = (() => {
  const formatRp = v => isNaN(v) ? 'Rp0' : 'Rp' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const uid = () => 'p_' + Math.random().toString(36).slice(2, 9);
  const escapeJs = s => (s || '').replace(/'/g, "\\'").replace(/\n/g, " ");
  const escapeHtml = s => (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const extractSheetId = url => {
    const m = url.match(/\/spreadsheets\/d\/([^/]+)/);
    return m ? m[1] : null;
  };
  return { formatRp, uid, escapeJs, escapeHtml, extractSheetId };
})();

/******************************
 * STORAGE & STATE
 ******************************/
const Storage = (() => {
  const KEYS = {
    PROFILES: 'jastip_profiles',
    CURRENT: 'jastip_current_profile',
    CART: 'jastip_cart'
  };

  const getProfiles = () => JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]');
  const saveProfiles = profiles => localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
  const getCurrentProfileId = () => localStorage.getItem(KEYS.CURRENT) || null;
  const setCurrentProfileId = id => id ? localStorage.setItem(KEYS.CURRENT, id) : localStorage.removeItem(KEYS.CURRENT);
  const getCart = () => JSON.parse(localStorage.getItem(KEYS.CART) || '{}');
  const saveCart = cart => localStorage.setItem(KEYS.CART, JSON.stringify(cart));

  return { KEYS, getProfiles, saveProfiles, getCurrentProfileId, setCurrentProfileId, getCart, saveCart };
})();

let profiles = Storage.getProfiles();
let currentProfileId = Storage.getCurrentProfileId();
let cart = Storage.getCart();
let PRODUCTS = [];
let currentCategory = '';

/******************************
 * DOM ELEMENTS
 ******************************/
const DOM = {
  productsEl: document.getElementById('products'),
  cartDrawer: document.getElementById('cartdrawer'),
  cartCount: document.getElementById('cartcount'),
  subtitleEl: document.getElementById('subtitleEl'),
  heroDescEl: document.getElementById('heroDesc'),
  waLink: document.getElementById('waLink'),
  logoEl: document.getElementById('logoEl'),
  logoPreview: document.getElementById('logoPreview')
};

/******************************
 * PROFILE MANAGER
 ******************************/
const ProfileManager = (() => {
  const getCurrentProfile = () => profiles.find(p => p.id === currentProfileId) || null;

  const setCurrentProfile = id => {
    currentProfileId = id;
    Storage.setCurrentProfileId(id);
  };

  const applySetup = profile => {
    if (!profile) return;
    const theme = profile.theme || {};
    document.documentElement.style.setProperty('--accent', theme.accent || '#2f8f4a');
    document.documentElement.style.setProperty('--bg', theme.bg || '#f7f9f8');
    document.documentElement.style.setProperty('--card', theme.card || '#ffffff');

    DOM.logoEl.innerHTML = profile.logo
      ? `<img width="50px" src="${profile.logo}" alt="${profile.name}">`
      : (profile.name ? profile.name.slice(0, 2).toUpperCase() : 'JS');

    DOM.subtitleEl.textContent = profile.name || '';
    DOM.heroDescEl.textContent = profile.desc || '';
    DOM.waLink.href = `https://wa.me/${profile.wa}`;
    document.getElementById('footerText').textContent =
      `${profile.name} • Jadwal: Senin–Jumat • Order cutoff 16:00`;
  };

  const openSetupModal = () => {
    renderProfilesList();
    const modal = document.getElementById('setupModal');
    modal.style.display = 'flex';
    Wizard.init();
  };

  const closeSetupModal = () => document.getElementById('setupModal').style.display = 'none';

  const renderProfilesList = () => {
    const listEl = document.getElementById('profilesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (profiles.length === 0) {
      listEl.innerHTML = '<div class="small">Belum ada profil — buat profil baru.</div>';
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
          <div class="profile-meta">${p.sheet || ''}</div>
        </div>
        <div>
          <button class="btn-ghost" onclick="ProfileManager.useProfile('${p.id}')">Pakai</button>
        </div>
      `;
      listEl.appendChild(div);
    });

    fillFormWithProfile(getCurrentProfile());
  };

  const fillFormWithProfile = p => {
    document.getElementById('inputNama').value = p ? p.name : '';
    document.getElementById('inputDeskripsi').value = p ? p.desc : '';
    document.getElementById('inputWA').value = p ? p.wa : '';
    document.getElementById('inputSheet').value = p ? p.sheet : '';
    document.getElementById('inputAccent').value = p?.theme?.accent || '#2f8f4a';
    document.getElementById('inputBg').value = p?.theme?.bg || '#f7f9f8';
    document.getElementById('inputCard').value = p?.theme?.card || '#ffffff';
    DOM.logoPreview.innerHTML = p?.logo
      ? `<img src="${p.logo}" alt="logo" style="width:100%;height:100%;object-fit:cover">`
      : 'JS';
  };

  const useProfile = id => {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    setCurrentProfile(id);
    applySetup(p);
    closeSetupModal();
    ProductManager.loadProducts();
  };

  return { getCurrentProfile, setCurrentProfile, applySetup, openSetupModal, closeSetupModal, renderProfilesList, useProfile, fillFormWithProfile };
})();

/******************************
 * WIZARD
 ******************************/
const Wizard = (() => {
  let currentStep = 1;
  const totalSteps = 4;
  const showStep = step => {
    document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
    document.querySelector(`.wizard-step[data-step="${step}"]`).style.display = 'block';
    document.getElementById('prevBtn').style.visibility = step === 1 ? 'hidden' : 'visible';
    document.getElementById('nextBtn').style.display = step < totalSteps ? 'inline-block' : 'none';
    document.getElementById('saveBtn').style.display = step === totalSteps ? 'inline-block' : 'none';
  };
  const nextStep = () => { if (currentStep < totalSteps) { currentStep++; showStep(currentStep); } };
  const prevStep = () => { if (currentStep > 1) { currentStep--; showStep(currentStep); } };
  const init = () => { currentStep = 1; showStep(currentStep); };
  return { nextStep, prevStep, init };
})();

/******************************
 * CART MANAGER
 ******************************/
const CartManager = (() => {
  const updateCartCount = () => {
    const totalQty = Object.values(cart).reduce((a, b) => a + b.qty, 0);
    DOM.cartCount.textContent = totalQty;
    DOM.cartCount.style.display = totalQty > 0 ? 'inline-block' : 'none';
  };

  const renderCart = () => {
    const list = document.getElementById('cartitems');
    const totalDiv = document.getElementById('carttotal');
    list.innerHTML = '';
    const items = Object.values(cart);
    if (items.length === 0) { DOM.cartDrawer.classList.remove('active'); return; }

    let total = 0;
    items.forEach(i => {
      const subtotal = i.price * i.qty;
      total += subtotal;
      list.innerHTML += `
        <div class="cart-item">
          <div class="cart-item-name">${Utils.escapeHtml(i.name)}<br><small>${Utils.formatRp(i.price)}</small></div>
          <div class="cart-controls">
            <button onclick="CartManager.changeQty('${Utils.escapeJs(i.name)}', -1)">-</button>
            <span>${i.qty}</span>
            <button onclick="CartManager.changeQty('${Utils.escapeJs(i.name)}', 1)">+</button>
            <button onclick="CartManager.removeItem('${Utils.escapeJs(i.name)}')">❌</button>
          </div>
        </div>
      `;
    });
    totalDiv.textContent = 'Total: ' + Utils.formatRp(total);
  };

  const addToCart = (name, price, openNow = false) => {
    if (!cart[name]) cart[name] = { name, price, qty: 0 };
    cart[name].qty++;
    Storage.saveCart(cart);
    updateCartCount();
    if (openNow) openCart();
  };

  const changeQty = (name, delta) => {
    if (!cart[name]) return;
    cart[name].qty += delta;
    if (cart[name].qty <= 0) delete cart[name];
    Storage.saveCart(cart);
    renderCart();
    updateCartCount();
  };

  const removeItem = name => { delete cart[name]; Storage.saveCart(cart); renderCart(); updateCartCount(); };
  const toggleCart = () => { DOM.cartDrawer.classList.toggle('active'); renderCart(); };
  const openCart = () => { DOM.cartDrawer.classList.add('active'); renderCart(); };
  const minimizeCart = () => DOM.cartDrawer.classList.remove('active');

  return { addToCart, changeQty, removeItem, toggleCart, openCart, minimizeCart, updateCartCount, renderCart };
})();

const saveProfile = () => {
  const name = document.getElementById('inputNama').value.trim();
  const desc = document.getElementById('inputDeskripsi').value.trim();
  const wa = document.getElementById('inputWA').value.trim();
  const sheet = document.getElementById('inputSheet').value.trim();
  const accent = document.getElementById('inputAccent').value;
  const bg = document.getElementById('inputBg').value;
  const card = document.getElementById('inputCard').value;
  const logoData = document.getElementById('setupModal').dataset.logoData || null;

  if (!name || !desc || !wa || !sheet) {
    alert('❌ Semua field (Nama, Deskripsi, WA, Sheet) wajib diisi.');
    return;
  }
  if (!sheet.includes('/spreadsheets/d/') || !sheet.includes('export?format=csv')) {
    alert('❌ Link Google Sheet tidak valid. Pastikan berformat export?format=csv');
    return;
  }

  let profile = currentProfileId
    ? profiles.find(p => p.id === currentProfileId)
    : null;

  if (profile) {
    // Update existing
    profile.name = name;
    profile.desc = desc;
    profile.wa = wa;
    profile.sheet = sheet;
    profile.theme = { accent, bg, card };
    if (logoData) profile.logo = logoData;
  } else {
    // Create new
    profile = {
      id: Utils.uid(),
      name,
      desc,
      wa,
      sheet,
      theme: { accent, bg, card },
      logo: logoData || null,
      created: Date.now()
    };
    profiles.push(profile);
    ProfileManager.setCurrentProfile(profile.id);
  }

  Storage.saveProfiles(profiles);
  ProfileManager.applySetup(profile);
  ProfileManager.renderProfilesList();
  ProfileManager.closeSetupModal();
  ProductManager.loadProducts();

  delete document.getElementById('setupModal').dataset.logoData;
  alert('✅ Profil berhasil disimpan!');
};


/******************************
 * PRODUCT MANAGER
 ******************************/
const ProductManager = (() => {
  const loadProducts = () => {
    const profile = ProfileManager.getCurrentProfile();
    if (!profile) { alert('Pilih atau buat profil terlebih dahulu.'); return; }

    fetch(profile.sheet)
      .then(res => { if (!res.ok) throw new Error('Fetch gagal'); return res.text(); })
      .then(csv => {
        const rows = csv.split("\n").slice(1).map(r => r.trim()).filter(Boolean);
        PRODUCTS = rows.map(r => {
          const [name, shop, price, img, fee, category, promo, stock] = r.split(",");
          return { 
            id: Math.random(),
            name: name?.trim() || '',
            shop: shop?.trim() || '',
            price: +(price || 0),
            img: img?.trim() || '',
            fee: +(fee || 0),
            category: category?.trim() || '',
            promo: (promo || '').trim().toLowerCase(),
            stock: isNaN(stock) ? 0 : +stock
          };
        }).filter(p => p.name);

        populateCategories();
        renderProducts();
      })
      .catch(() => alert('Gagal memuat data dari Google Sheet.'));
  };

  const populateCategories = () => {
    const filtersEl = document.getElementById('categoryFilters');
    filtersEl.innerHTML = '<div class="chip active" onclick="ProductManager.filterCategory(\'\')">Semua</div>';
    [...new Set(PRODUCTS.map(p => p.category))].filter(Boolean).forEach(cat => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = cat;
      chip.onclick = () => filterCategory(cat);
      filtersEl.appendChild(chip);
    });
  };

  const filterCategory = cat => {
    currentCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const selected = [...document.querySelectorAll('.chip')].find(c => c.textContent === cat);
    if (selected) selected.classList.add('active'); else document.querySelector('.chip:first-child').classList.add('active');
    renderProducts();
  };

  const renderProducts = () => {
    DOM.productsEl.innerHTML = '';
    PRODUCTS.filter(p => !currentCategory || p.category === currentCategory).forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      const imgPart = p.img ? `<img src="${p.img}" alt="${p.name}">`
        : `<div style="padding:8px;text-align:center;color:var(--muted)">${p.shop}</div>`;
      card.innerHTML = `
        <div class="img">${imgPart}</div>
        <div class="pname">${Utils.escapeHtml(p.name)}</div>
        <div class="shop">${Utils.escapeHtml(p.shop)}</div>
        <div class="price">${Utils.formatRp(p.price)} + Fee ${Utils.formatRp(p.fee)}</div>
        <div class="stock">Stok: ${p.stock}</div>
        <button class="btn add" onclick="CartManager.addToCart('${Utils.escapeJs(p.name)}', ${p.price + p.fee})">+ Titip</button>
        <button class="btn quick" onclick="CartManager.addToCart('${Utils.escapeJs(p.name)}', ${p.price + p.fee}, true)">Beli Cepat</button>
      `;
      DOM.productsEl.appendChild(card);
    });
    CartManager.updateCartCount();
  };

  return { loadProducts, populateCategories, renderProducts, filterCategory };
})();

/******************************
 * CHECKOUT MANAGER
 ******************************/

const CheckoutManager = (() => {
  // 🔹 Buat elemen loading overlay (sekali saja)
  const createLoadingOverlay = () => {
    let loader = document.getElementById("checkoutLoading");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "checkoutLoading";
      loader.innerHTML = `
        <div class="loader-overlay">
          <div class="loader-box">
            <div class="spinner"></div>
            <div>Pesanan sedang diproses...</div>
          </div>
        </div>
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = "flex";
  };

  const hideLoadingOverlay = () => {
    const loader = document.getElementById("checkoutLoading");
    if (loader) loader.style.display = "none";
  };

  // 🔹 Fungsi utama checkout
  const checkout = async () => {
    const cartData = Storage.getCart();
    if (!cartData || Object.keys(cartData).length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    const profile = ProfileManager.getCurrentProfile();
    if (!profile) {
      alert("Profil belum dipilih!");
      return;
    }

    const sheetId = Utils.extractSheetId(profile.sheet);
    const items = Object.values(cartData);
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const orderData = {
      sheetId,
      profileName: profile.name,
      wa: profile.wa,
      items,
      total,
      timestamp: new Date().toISOString()
    };

    try {
      // 🕓 Tampilkan loading
      createLoadingOverlay();

      // Simpan ke Firebase
      const newOrderRef = db.ref("orders").push();
      await newOrderRef.set(orderData);
      console.log("✅ Order tersimpan di Firebase:", newOrderRef.key);

      // Bersihkan data
      localStorage.removeItem(Storage.KEYS.CART);
      //CartManager.clearCart();
      //CartManager.minimizeCart();

      // 🚀 Kirim ke WhatsApp
      const msg = [
        "Halo, saya mau titip:",
        ...items.map(i => `- ${i.name} (${i.qty}x Rp${i.price.toLocaleString()})`),
        "",
        `Total: Rp${total.toLocaleString()}`,
        "",
        "_Silakan konfirmasi pembayaran setelah pesan dikirim._"
      ].join("\n");
      window.open(`https://wa.me/${profile.wa}?text=${encodeURIComponent(msg)}`, "_blank");

      // ✅ Notifikasi sukses
      showToast("✅ Pesanan telah diterima dan disimpan!");
    } catch (err) {
      console.error("❌ Gagal menyimpan ke Firebase:", err);
      alert("❌ Pesanan gagal disimpan ke Firebase.");
    } finally {
      hideLoadingOverlay();
    }
  };

  // 🔹 Toast helper
  const showToast = (msg) => {
    const toast = document.createElement("div");
    toast.className = "toast-success";
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "80px",
      right: "20px",
      background: "var(--accent)",
      color: "#fff",
      padding: "10px 16px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontSize: "14px",
      zIndex: "9999",
      opacity: "0",
      transition: "opacity .3s ease"
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = "1"));
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  return { checkout };
})();


/******************************
 * INIT
 ******************************/
window.addEventListener('load', () => {
  if (profiles.length > 0 && currentProfileId) {
    const p = ProfileManager.getCurrentProfile();
    if (p) ProfileManager.applySetup(p);
  }

  if (profiles.length === 0) ProfileManager.openSetupModal();
  else if (currentProfileId) ProductManager.loadProducts();

  CartManager.updateCartCount();
});

/******************************
 * GLOBAL EXPOSE
 ******************************/
window.ProfileManager = ProfileManager;
window.CartManager = CartManager;
window.ProductManager = ProductManager;
window.Wizard = Wizard;
window.CheckoutManager = CheckoutManager;

/******************************
 * BACKWARD COMPATIBILITY
 ******************************/
window.saveProfile = ProfileManager.saveProfile;
window.nextStep = Wizard.nextStep;
window.prevStep = Wizard.prevStep;
window.checkout = CheckoutManager.checkout;
window.openSetupModal = ProfileManager.openSetupModal;
window.closeSetupModal = ProfileManager.closeSetupModal;
window.addToCart = CartManager.addToCart;
window.toggleCart = CartManager.toggleCart;
window.changeQty = CartManager.changeQty;
window.removeItem = CartManager.removeItem;
window.minimizeCart = CartManager.minimizeCart;
