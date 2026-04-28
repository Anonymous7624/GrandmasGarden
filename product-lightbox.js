/**
 * Product detail photo lightbox: tap main hero to open, swipe between main + placeholder,
 * pinch/wheel/button zoom, backdrop or close to dismiss.
 */
(function () {
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const WHEEL_SENS = 0.0012;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function ensureModal() {
    let root = document.getElementById("ggPhotoLightbox");
    if (root) return root;

    root = document.createElement("div");
    root.id = "ggPhotoLightbox";
    root.className = "fixed inset-0 z-[95] hidden";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Product photos");
    root.innerHTML =
      '<div class="gg-lb-back absolute inset-0 bg-pine/90 backdrop-blur-md" data-lb-back></div>' +
      '<div class="relative z-10 flex h-full max-h-[100dvh] w-full flex-col">' +
      '  <div class="flex shrink-0 justify-end p-2 sm:p-3">' +
      '    <button type="button" class="gg-lb-close rounded-full bg-white/15 p-2.5 text-cream ring-1 ring-white/30 transition hover:bg-white/25" aria-label="Close">' +
      '      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
      "    </button>" +
      "  </div>" +
      '  <div class="gg-lb-scroll mx-auto flex min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden" style="-webkit-overflow-scrolling:touch">' +
      '    <div class="gg-lb-slide flex min-h-0 min-w-full shrink-0 snap-center items-center justify-center px-2 pb-4 sm:px-4">' +
      '      <div class="gg-lb-zoom-shell relative flex h-[min(78vh,720px)] w-full max-w-[min(96vw,920px)] flex-col items-stretch justify-center">' +
      '        <div class="gg-lb-zoom-outer relative flex-1 overflow-hidden rounded-xl bg-black/25 ring-1 ring-white/25" style="touch-action:pan-x pinch-zoom">' +
      '          <img class="gg-lb-img pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-h-full max-w-full object-contain select-none" alt="" draggable="false" decoding="async" />' +
      "        </div>" +
      '        <div class="mt-3 hidden items-center justify-center gap-2 md:flex">' +
      '          <button type="button" class="gg-lb-zm rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-cream ring-1 ring-white/25 transition hover:bg-white/25">Zoom out</button>' +
      '          <button type="button" class="gg-lb-zp rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-cream ring-1 ring-white/25 transition hover:bg-white/25">Zoom in</button>' +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      '    <div class="gg-lb-slide flex min-h-0 min-w-full shrink-0 snap-center items-center justify-center px-4 pb-8">' +
      '      <div class="flex h-[min(420px,65vh)] w-full max-w-lg items-center justify-center rounded-2xl bg-[#e8e4dc] px-6 text-center shadow-inner ring-1 ring-garden/20">' +
      '        <p class="text-sm font-semibold uppercase tracking-wide text-garden/80">More Photos Coming Soon</p>' +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      '  <p class="pointer-events-none pb-2 text-center text-xs text-cream/70">Swipe for more, pinch or scroll to zoom</p>' +
      "</div>";

    document.body.appendChild(root);
    return root;
  }

  let mainSrc = "";
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let pinch0 = null;
  let pan0 = null;
  let scrollEl = null;
  let zoomOuter = null;
  let imgEl = null;

  function applyTransform() {
    if (!imgEl) return;
    imgEl.style.transform = "translate(calc(-50% + " + tx + "px), calc(-50% + " + ty + "px)) scale(" + scale + ")";
    const outer = document.querySelector("#ggPhotoLightbox .gg-lb-zoom-outer");
    if (outer) outer.style.touchAction = scale > 1.02 ? "none" : "pan-x pinch-zoom";
  }

  function resetZoom() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function clampZoom(s) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));
  }

  function open() {
    const root = ensureModal();
    const img = qs(".gg-lb-img", root);
    img.src = mainSrc;
    img.alt = "";
    imgEl = img;
    scrollEl = qs(".gg-lb-scroll", root);
    zoomOuter = qs(".gg-lb-zoom-outer", root);
    root.classList.remove("hidden");
    root.classList.add("flex", "flex-col");
    resetZoom();
    if (scrollEl) scrollEl.scrollLeft = 0;
    if (window.GrandmasGardenCart && typeof window.GrandmasGardenCart.updateOverlayScrollLock === "function") {
      window.GrandmasGardenCart.updateOverlayScrollLock();
    } else {
      document.documentElement.setAttribute("data-panel-open", "true");
    }
    qs(".gg-lb-close", root)?.focus({ preventScroll: true });
  }

  function close() {
    const root = document.getElementById("ggPhotoLightbox");
    if (!root) return;
    root.classList.add("hidden");
    root.classList.remove("flex", "flex-col");
    if (window.GrandmasGardenCart && typeof window.GrandmasGardenCart.updateOverlayScrollLock === "function") {
      window.GrandmasGardenCart.updateOverlayScrollLock();
    } else {
      document.documentElement.removeAttribute("data-panel-open");
    }
    resetZoom();
  }

  function onWheel(e) {
    if (!zoomOuter) return;
    const rect = zoomOuter.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    e.preventDefault();
    const prev = scale;
    scale = clampZoom(scale * (1 - e.deltaY * WHEEL_SENS * 18));
    if (scale !== prev && scale > ZOOM_MIN) {
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      tx = (tx - dx) * (scale / prev) + dx;
      ty = (ty - dy) * (scale / prev) + dy;
    }
    if (scale <= ZOOM_MIN + 0.001) {
      scale = ZOOM_MIN;
      tx = 0;
      ty = 0;
    }
    applyTransform();
  }

  function dist(t0, t1) {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  function mid(t0, t1) {
    return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
  }

  function wireZoomPan() {
    const root = ensureModal();
    const outer = qs(".gg-lb-zoom-outer", root);
    if (!outer || outer.dataset.ggLbWired) return;
    outer.dataset.ggLbWired = "1";

    outer.addEventListener(
      "wheel",
      function (e) {
        if (!outer.contains(e.target) && e.target !== outer) return;
        onWheel(e);
      },
      { passive: false }
    );

    outer.addEventListener("touchstart", onTouchStart, { passive: false });
    outer.addEventListener("touchmove", onTouchMove, { passive: false });
    outer.addEventListener("touchend", onTouchEnd, { passive: true });
    outer.addEventListener("touchcancel", onTouchEnd, { passive: true });

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        pinch0 = { d0: dist(e.touches[0], e.touches[1]), s0: scale, mid: mid(e.touches[0], e.touches[1]) };
        pan0 = null;
        e.preventDefault();
      } else if (e.touches.length === 1 && scale > 1.02) {
        pan0 = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty };
        pinch0 = null;
        e.preventDefault();
      } else {
        pinch0 = null;
        pan0 = null;
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && pinch0) {
        const d = dist(e.touches[0], e.touches[1]);
        const m = mid(e.touches[0], e.touches[1]);
        const next = clampZoom((pinch0.s0 * d) / pinch0.d0);
        const rect = outer.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const factor = next / scale;
        tx = (tx - (m.x - cx)) * factor + (m.x - cx);
        ty = (ty - (m.y - cy)) * factor + (m.y - cy);
        scale = next;
        applyTransform();
        e.preventDefault();
      } else if (e.touches.length === 1 && pan0) {
        tx = e.touches[0].clientX - pan0.x;
        ty = e.touches[0].clientY - pan0.y;
        applyTransform();
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      pinch0 = null;
      pan0 = null;
      if (scale < ZOOM_MIN + 0.02) {
        scale = ZOOM_MIN;
        tx = 0;
        ty = 0;
        applyTransform();
      }
    }

    qs(".gg-lb-zp", root)?.addEventListener("click", function () {
      const rect = outer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const prev = scale;
      scale = clampZoom(scale * 1.2);
      const factor = scale / prev;
      tx = (tx - (rect.width / 2)) * factor + rect.width / 2;
      ty = (ty - (rect.height / 2)) * factor + rect.height / 2;
      applyTransform();
    });
    qs(".gg-lb-zm", root)?.addEventListener("click", function () {
      const prev = scale;
      scale = clampZoom(scale / 1.2);
      if (scale <= ZOOM_MIN + 0.001) {
        scale = ZOOM_MIN;
        tx = 0;
        ty = 0;
      } else {
        const factor = scale / prev;
        tx *= factor;
        ty *= factor;
      }
      applyTransform();
    });
  }

  function wireModalChrome() {
    const root = ensureModal();
    if (root.dataset.ggLbChrome) return;
    root.dataset.ggLbChrome = "1";

    root.addEventListener("click", function (e) {
      if (e.target.closest(".gg-lb-back") || e.target.closest(".gg-lb-close")) close();
    });

    scrollEl = qs(".gg-lb-scroll", root);
    if (scrollEl) {
      scrollEl.addEventListener("scroll", function () {
        if (!scrollEl) return;
        const w = scrollEl.clientWidth;
        if (w < 8) return;
        const idx = Math.round(scrollEl.scrollLeft / w);
        if (idx !== 0) resetZoom();
      });
    }

    wireZoomPan();
  }

  function init(opts) {
    mainSrc = opts && opts.mainSrc ? opts.mainSrc : "";
    const triggerSel = (opts && opts.trigger) || "#detailHeroOpen";
    wireModalChrome();

    function bindTrigger(el) {
      if (!el || el.dataset.ggLbTrigger) return;
      el.dataset.ggLbTrigger = "1";
      el.addEventListener("click", function (e) {
        if (e.target.closest("a,button")) return;
        open();
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    }

    const el = typeof triggerSel === "string" ? document.querySelector(triggerSel) : triggerSel;
    bindTrigger(el);

    if (opts && opts.watchTrigger) {
      new MutationObserver(function () {
        const n = document.querySelector(triggerSel);
        if (n && !n.dataset.ggLbTrigger) bindTrigger(n);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  function setMainSrc(src) {
    mainSrc = src || "";
  }

  window.GrandmasGardenProductLightbox = {
    init,
    close,
    setMainSrc,
  };
})();
