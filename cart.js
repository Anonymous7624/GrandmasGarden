/**
 * Grandma's Garden — shared cart (localStorage) + drawer UI.
 * Expects the same cart/checkout DOM as on index.html.
 */
(function () {
  const STORAGE_KEY = "grandmas-garden-cart-v1";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let cart = [];

  function money(n) {
    return "$" + Number(n).toFixed(0);
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];
    } catch {
      cart = [];
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadge();
    renderCart();
  }

  function updateBadge() {
    const n = cart.reduce((a, l) => a + l.qty, 0);
    const badge = $("#cartBadge");
    if (!badge) return;
    badge.textContent = String(n);
    badge.classList.toggle("opacity-0", n === 0);
  }

  function updateOverlayScrollLock() {
    const cartOpen = $("#cartDrawer") && !$("#cartDrawer").classList.contains("translate-x-full");
    const checkoutOpen = $("#checkoutModal") && !$("#checkoutModal").classList.contains("hidden");
    if (cartOpen || checkoutOpen) {
      document.documentElement.setAttribute("data-panel-open", "true");
    } else {
      document.documentElement.removeAttribute("data-panel-open");
    }
  }

  function showToast(msg) {
    const t = $("#toast");
    const text = $("#toastText");
    if (!t || !text) return;
    text.textContent = msg;
    t.classList.remove("translate-y-24", "opacity-0");
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(() => {
      t.classList.add("translate-y-24", "opacity-0");
    }, 2600);
  }

  function openCart() {
    const backdrop = $("#cartBackdrop");
    const drawer = $("#cartDrawer");
    if (!backdrop || !drawer) return;
    backdrop.classList.remove("hidden");
    requestAnimationFrame(() => {
      backdrop.classList.remove("opacity-0");
      drawer.classList.remove("translate-x-full");
      updateOverlayScrollLock();
    });
  }

  function closeCart() {
    const backdrop = $("#cartBackdrop");
    const drawer = $("#cartDrawer");
    if (!backdrop || !drawer) return;
    drawer.classList.add("translate-x-full");
    backdrop.classList.add("opacity-0");
    setTimeout(() => {
      backdrop.classList.add("hidden");
      updateOverlayScrollLock();
    }, 300);
    updateOverlayScrollLock();
  }

  function renderCart() {
    const empty = $("#cartEmpty");
    const listWrap = $("#cartListWrap");
    const list = $("#cartList");
    if (!empty || !listWrap || !list) return;

    if (cart.length === 0) {
      empty.classList.remove("hidden");
      listWrap.classList.add("hidden");
      return;
    }
    empty.classList.add("hidden");
    listWrap.classList.remove("hidden");
    let sub = 0;
    list.innerHTML = cart
      .map((line, idx) => {
        const unit = line.unitPrice;
        sub += unit * line.qty;
        const sizePart = line.sizeLabel
          ? `<span class="text-xs text-pine/60">${line.sizeLabel}</span>`
          : "";
        const img = line.image;
        const isData = String(img).startsWith("data:");
        return `
            <div class="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-garden/10" data-idx="${idx}">
              <div class="flex gap-3">
                <div class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream ring-1 ring-garden/10">
                  <img src="${img}" alt="" class="h-full w-full ${isData ? "object-contain" : "object-cover"}" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="font-semibold text-pine">${line.title}</p>
                      ${sizePart}
                    </div>
                    <button type="button" class="cart-remove text-terracotta transition hover:opacity-80" data-idx="${idx}" aria-label="Remove item">
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                  <div class="mt-3 flex items-center justify-between">
                    <div class="flex items-center rounded-lg bg-cream p-0.5 ring-1 ring-garden/10">
                      <button type="button" class="cart-qty h-8 w-8 rounded-md text-sm font-bold text-pine transition hover:bg-white" data-delta="-1" data-idx="${idx}">−</button>
                      <span class="min-w-[1.5rem] text-center text-sm font-semibold">${line.qty}</span>
                      <button type="button" class="cart-qty h-8 w-8 rounded-md text-sm font-bold text-pine transition hover:bg-white" data-delta="1" data-idx="${idx}">+</button>
                    </div>
                    <p class="font-display text-lg text-terracotta">${money(unit * line.qty)}</p>
                  </div>
                </div>
              </div>
            </div>`;
      })
      .join("");
    const subtotalEl = $("#cartSubtotal");
    if (subtotalEl) subtotalEl.textContent = money(sub);

    list.querySelectorAll(".cart-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = +btn.getAttribute("data-idx");
        cart.splice(i, 1);
        saveCart();
      });
    });
    list.querySelectorAll(".cart-qty").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = +btn.getAttribute("data-idx");
        const d = +btn.getAttribute("data-delta");
        const line = cart[i];
        line.qty = Math.min(9, Math.max(1, line.qty + d));
        saveCart();
      });
    });
  }

  /**
   * @param {{ key: string, productId: string, title: string, sizeLabel?: string|null, unitPrice: number, qty: number, image: string }} line
   */
  function addOrMergeLine(line) {
    const existing = cart.find((l) => l.key === line.key);
    const addQty = Math.min(9, Math.max(1, line.qty || 1));
    if (existing) {
      existing.qty = Math.min(9, existing.qty + addQty);
    } else {
      cart.push({ ...line, qty: addQty });
    }
    saveCart();
    showToast("Added to your cart — thank you, dear!");
  }

  function init(options) {
    const opts = options || {};
    const shopHref = opts.shopHref || "shop.html";

    loadCart();
    updateBadge();
    renderCart();

    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();

    $("#cartBtn")?.addEventListener("click", () => openCart());
    $("#cartClose")?.addEventListener("click", () => closeCart());
    $("#cartBackdrop")?.addEventListener("click", () => closeCart());

    $("#continueShopping")?.addEventListener("click", () => {
      closeCart();
      window.location.href = shopHref;
    });

    $("#checkoutBtn")?.addEventListener("click", () => {
      $("#checkoutModal")?.classList.remove("hidden");
      $("#checkoutModal")?.classList.add("flex");
      updateOverlayScrollLock();
    });
    $("#checkoutClose")?.addEventListener("click", () => {
      $("#checkoutModal")?.classList.add("hidden");
      $("#checkoutModal")?.classList.remove("flex");
      updateOverlayScrollLock();
    });
    $("#checkoutBackdrop")?.addEventListener("click", () => {
      $("#checkoutModal")?.classList.add("hidden");
      $("#checkoutModal")?.classList.remove("flex");
      updateOverlayScrollLock();
    });

    $("#menuBtn")?.addEventListener("click", () => {
      const mm = $("#mobileMenu");
      if (!mm) return;
      const open = mm.classList.contains("hidden");
      mm.classList.toggle("hidden", !open);
      $("#menuBtn")?.setAttribute("aria-expanded", open ? "true" : "false");
      $("#menuIconOpen")?.classList.toggle("hidden", open);
      $("#menuIconClose")?.classList.toggle("hidden", !open);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeCart();
        $("#checkoutModal")?.classList.add("hidden");
        $("#checkoutModal")?.classList.remove("flex");
        updateOverlayScrollLock();
      }
    });

    $$(".mobile-nav").forEach((a) => {
      a.addEventListener("click", () => {
        $("#mobileMenu")?.classList.add("hidden");
        $("#menuBtn")?.setAttribute("aria-expanded", "false");
        $("#menuIconOpen")?.classList.remove("hidden");
        $("#menuIconClose")?.classList.add("hidden");
      });
    });
  }

  window.GrandmasGardenCart = {
    init,
    addOrMergeLine,
    money,
    openCart,
    closeCart,
    showToast,
    cartLineKey(productId, sizeId) {
      return productId + "|" + (sizeId || "");
    },
  };
})();
