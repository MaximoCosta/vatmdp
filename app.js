(function () {
  "use strict";

  var RAW = [
    ["WAKA 70K", "DOUBLE FRESH MINT", 36000],
    ["WAKA 70K", "DOUBLE GREEN APPLE", 36000],
    ["ELFBAR DUKE 35K", "GRAPE ICE", 26500],
    ["ELFBAR ICE KING 40K", "MIAMI MINT", 29500],
    ["ELFBAR ICE KING 40K", "DRAGON STRAWNANA", 29500],
    ["ELFBAR ICE KING 40K", "BLUE RAZZ ICE", 29500],
    ["ELFBAR ICE KING 40K", "SOUR APPLE ICE", 29500],
    ["ELFBAR ICE KING 40K", "TIGERS BLOOD", 29500],
    ["ELFBAR ICE KING 40K", "CHERRY FUSE", 29500],
    ["ELFBAR ICE KING 40K", "SCARY BERRY", 29500],
    ["ELFBAR ICE KING 40K", "CHERRY STRAZZ", 29500],
    ["ELFBAR ICE KING 40K", "DOUBLE APPLE ICE", 29500],
    ["ELFBAR ICE KING 40K", "COCA SLUSH", 29500],
    ["IGNITE V400", "SAKURA GRAPE", 32500],
    ["IGNITE V400", "GRAPE MIX", 32500],
    ["IGNITE V400", "BLUEBERRY", 32500]
  ];

  var PRODUCTS = RAW.map(function (r, i) {
    return { id: "p" + i, cat: r[0], flavor: r[1], price: r[2] };
  });

  var WA = "542236947306";
  var PAYS = ["Transferencia", "Efectivo", "Link de pago"];

  function money(n) {
    return "$ " + n.toLocaleString("es-AR");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function parsePuffs(cat) {
    var m = cat.match(/(\d+)K/i);
    return m ? (Number(m[1]) * 1000).toLocaleString("es-AR") : null;
  }

  var VAPE_ICON =
    '<svg class="vape-icon" viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="22" y="0" width="16" height="18" rx="5" fill="currentColor" />' +
    '<rect x="4" y="14" width="52" height="116" rx="22" fill="currentColor" />' +
    '<rect class="vape-icon__accent" x="4" y="58" width="52" height="16" />' +
    '<circle class="vape-icon__dot" cx="30" cy="112" r="3.5" />' +
    "</svg>";

  function productDescription(p) {
    var puffs = parsePuffs(p.cat);
    return p.cat.split(" ")[0] + " descartable, sabor " + p.flavor.toLowerCase() +
      ". Listo para usar, sin carga ni recarga." +
      (puffs ? " Rinde aproximadamente " + puffs + " pitadas." : "");
  }

  var state = {
    cat: "Todo",
    query: "",
    cart: {},
    view: null,
    name: "",
    addr: "",
    pay: "Transferencia",
    ship: "envio",
    product: null
  };

  var els = {
    tabs: document.getElementById("tabs"),
    search: document.getElementById("search"),
    grid: document.getElementById("grid"),
    noResults: document.getElementById("no-results"),
    cartbar: document.getElementById("cartbar"),
    cartbarCount: document.getElementById("cartbar-count"),
    cartbarTotal: document.getElementById("cartbar-total"),
    cartbarCta: document.getElementById("cartbar-cta"),
    headerCart: document.getElementById("header-cart"),
    headerCartCount: document.getElementById("header-cart-count"),
    checkoutOverlay: document.getElementById("checkout-overlay"),
    checkoutClose: document.getElementById("checkout-close"),
    checkoutLines: document.getElementById("checkout-lines"),
    fieldName: document.getElementById("field-name"),
    fieldAddr: document.getElementById("field-addr"),
    pickEnvio: document.getElementById("pick-envio"),
    pickRetiro: document.getElementById("pick-retiro"),
    payments: document.getElementById("payments"),
    msgboxText: document.getElementById("msgbox-text"),
    checkoutSend: document.getElementById("checkout-send"),
    sentOverlay: document.getElementById("sent-overlay"),
    sentReset: document.getElementById("sent-reset"),
    catalogView: document.getElementById("catalog-view"),
    productView: document.getElementById("product-view"),
    pvCat: document.getElementById("pv-cat"),
    pvFlavor: document.getElementById("pv-flavor"),
    pvPrice: document.getElementById("pv-price"),
    pvDesc: document.getElementById("pv-desc"),
    pvStepperWrap: document.getElementById("pv-stepper-wrap"),
    pvWhatsapp: document.getElementById("pv-whatsapp"),
    pvSpecs: document.getElementById("pv-specs"),
    pvRelated: document.getElementById("pv-related")
  };

  function lines() {
    return Object.keys(state.cart)
      .map(function (id) {
        var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
        return { p: p, qty: state.cart[id] };
      })
      .filter(function (l) { return l.p; });
  }

  function total() {
    return lines().reduce(function (a, l) { return a + l.p.price * l.qty; }, 0);
  }

  function message() {
    var L = lines();
    var items = L.map(function (l) {
      return "• " + l.qty + "x " + l.p.cat + " " + l.p.flavor + " — " + money(l.p.price * l.qty);
    }).join("\n");
    var entrega = state.ship === "envio"
      ? "Envío por Uber a: " + (state.addr || "(dirección)")
      : "Retiro en el local (Talcahuano 94)";
    return "Hola Vat Mardel! Quiero pedir:\n\n" + (items || "• (bolsa vacía)") +
      "\n\nTotal: " + money(total()) + "\n\nNombre: " + (state.name || "(tu nombre)") +
      "\n" + entrega + "\nPago: " + state.pay;
  }

  function bump(id, d) {
    var qty = (state.cart[id] || 0) + d;
    if (qty < 1) {
      delete state.cart[id];
    } else {
      state.cart[id] = qty;
    }
    renderGrid();
    renderCartBar();
    if (state.view === "checkout") renderCheckoutLines();
    if (!els.productView.hidden && state.product === id) renderProductStepper();
  }

  function categoryCounts() {
    var counts = {};
    PRODUCTS.forEach(function (p) {
      counts[p.cat] = (counts[p.cat] || 0) + 1;
    });
    return counts;
  }

  function categoryList() {
    var counts = categoryCounts();
    var list = [{ label: "Todo", count: PRODUCTS.length }];
    Object.keys(counts).forEach(function (k) {
      list.push({ label: k, count: counts[k] });
    });
    return list;
  }

  function visibleProducts() {
    var q = state.query.trim().toLowerCase();
    return PRODUCTS.filter(function (p) {
      var matchesCat = state.cat === "Todo" || p.cat === state.cat;
      var matchesQuery = !q || (p.flavor + " " + p.cat).toLowerCase().indexOf(q) !== -1;
      return matchesCat && matchesQuery;
    });
  }

  function renderTabs() {
    var html = categoryList().map(function (c) {
      var active = state.cat === c.label ? " is-active" : "";
      return '<button class="tab' + active + '" data-cat="' + escapeHtml(c.label) + '">' +
        escapeHtml(c.label) + '<span class="tab__count">' + c.count + "</span></button>";
    }).join("");
    els.tabs.innerHTML = html;
    Array.prototype.forEach.call(els.tabs.querySelectorAll(".tab"), function (btn) {
      btn.addEventListener("click", function () {
        state.cat = btn.getAttribute("data-cat");
        renderTabs();
        renderGrid();
      });
    });
  }

  function renderGrid() {
    var visible = visibleProducts();
    els.noResults.hidden = visible.length !== 0;

    els.grid.innerHTML = visible.map(function (p) {
      var qty = state.cart[p.id] || 0;
      var control = qty > 0
        ? '<div class="stepper">' +
          '<button class="stepper__btn" data-dec="' + p.id + '">−</button>' +
          '<span class="stepper__qty">' + qty + "</span>" +
          '<button class="stepper__btn" data-inc="' + p.id + '">+</button>' +
          "</div>"
        : '<button class="card__add" data-inc="' + p.id + '">Agregar</button>';

      return '<div class="card">' +
        '<a class="card__media" href="#/p/' + p.id + '">' +
          '<div class="card__image">' +
            '<div class="img-slot">' + VAPE_ICON + "</div>" +
            '<div class="card__cat">' + escapeHtml(p.cat) + "</div>" +
          "</div>" +
          '<div class="card__flavor">' + escapeHtml(p.flavor) + "</div>" +
        "</a>" +
        '<div class="card__row">' +
          '<span class="card__price">' + money(p.price) + "</span>" +
          control +
        "</div>" +
      "</div>";
    }).join("");

    Array.prototype.forEach.call(els.grid.querySelectorAll("[data-inc]"), function (btn) {
      btn.addEventListener("click", function () {
        bump(btn.getAttribute("data-inc"), 1);
      });
    });
    Array.prototype.forEach.call(els.grid.querySelectorAll("[data-dec]"), function (btn) {
      btn.addEventListener("click", function () {
        bump(btn.getAttribute("data-dec"), -1);
      });
    });
  }

  function renderCartBar() {
    var L = lines();
    var count = L.reduce(function (a, l) { return a + l.qty; }, 0);
    els.cartbar.hidden = L.length === 0;
    els.cartbarCount.textContent = count + " productos";
    els.cartbarTotal.textContent = money(total());

    els.headerCartCount.hidden = count === 0;
    els.headerCartCount.textContent = count;
    els.headerCartCount.classList.remove("is-pop");
    void els.headerCartCount.offsetWidth;
    els.headerCartCount.classList.add("is-pop");
  }

  function removeItem(id) {
    delete state.cart[id];
    renderGrid();
    renderCartBar();
    if (state.view === "checkout") renderCheckoutLines();
    if (!els.productView.hidden && state.product === id) renderProductStepper();
  }

  function renderCheckoutLines() {
    var L = lines();

    if (L.length === 0) {
      els.checkoutLines.innerHTML =
        '<div class="checkout__empty">' +
          '<div class="checkout__empty-text">Tu carrito está vacío.<br />Agregá tus sabores favoritos.</div>' +
          '<button id="checkout-empty-cta" class="pill" type="button">Ver catálogo</button>' +
        "</div>";
      var cta = document.getElementById("checkout-empty-cta");
      if (cta) cta.addEventListener("click", closeAll);
      renderMessage();
      return;
    }

    els.checkoutLines.innerHTML = L.map(function (l) {
      return '<div class="checkout__line">' +
        '<div class="checkout__line-info">' +
          '<span class="checkout__line-name">' + escapeHtml(l.p.flavor) + "</span>" +
          '<span class="checkout__line-unit">' + money(l.p.price) + " c/u</span>" +
        "</div>" +
        '<div class="checkout__line-controls">' +
          '<div class="stepper stepper--sm">' +
            '<button class="stepper__btn" data-dec="' + l.p.id + '">−</button>' +
            '<span class="stepper__qty">' + l.qty + "</span>" +
            '<button class="stepper__btn" data-inc="' + l.p.id + '">+</button>' +
          "</div>" +
          '<span class="checkout__line-total">' + money(l.p.price * l.qty) + "</span>" +
          '<button class="checkout__line-remove" data-remove="' + l.p.id + '" aria-label="Quitar">✕</button>' +
        "</div>" +
      "</div>";
    }).join("") + '<div class="checkout__total"><span>Total</span><span>' + money(total()) + "</span></div>";

    Array.prototype.forEach.call(els.checkoutLines.querySelectorAll("[data-inc]"), function (btn) {
      btn.addEventListener("click", function () {
        bump(btn.getAttribute("data-inc"), 1);
      });
    });
    Array.prototype.forEach.call(els.checkoutLines.querySelectorAll("[data-dec]"), function (btn) {
      btn.addEventListener("click", function () {
        bump(btn.getAttribute("data-dec"), -1);
      });
    });
    Array.prototype.forEach.call(els.checkoutLines.querySelectorAll("[data-remove]"), function (btn) {
      btn.addEventListener("click", function () {
        removeItem(btn.getAttribute("data-remove"));
      });
    });

    renderMessage();
  }

  function renderShipUI() {
    els.pickEnvio.classList.toggle("is-active", state.ship === "envio");
    els.pickRetiro.classList.toggle("is-active", state.ship === "retiro");
    els.fieldAddr.hidden = state.ship !== "envio";
  }

  function renderPayments() {
    els.payments.innerHTML = PAYS.map(function (m) {
      var active = state.pay === m ? " is-active" : "";
      return '<button class="pill' + active + '" data-pay="' + escapeHtml(m) + '">' + escapeHtml(m) + "</button>";
    }).join("");
    Array.prototype.forEach.call(els.payments.querySelectorAll("[data-pay]"), function (btn) {
      btn.addEventListener("click", function () {
        state.pay = btn.getAttribute("data-pay");
        renderPayments();
        renderMessage();
      });
    });
  }

  function renderMessage() {
    var msg = message();
    els.msgboxText.textContent = msg;
    els.checkoutSend.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  function openCheckout() {
    state.view = "checkout";
    els.checkoutOverlay.hidden = false;
    renderCheckoutLines();
    renderShipUI();
    renderPayments();
    renderMessage();
  }

  function closeAll() {
    state.view = null;
    els.checkoutOverlay.hidden = true;
    els.sentOverlay.hidden = true;
  }

  function resetAll() {
    state.cart = {};
    closeAll();
    renderGrid();
    renderCartBar();
  }

  function renderProductStepper() {
    var p = PRODUCTS.filter(function (x) { return x.id === state.product; })[0];
    if (!p) return;
    var qty = state.cart[p.id] || 0;

    els.pvStepperWrap.innerHTML = qty > 0
      ? '<div class="stepper stepper--lg">' +
        '<button class="stepper__btn" data-dec="' + p.id + '">−</button>' +
        '<span class="stepper__qty">' + qty + "</span>" +
        '<button class="stepper__btn" data-inc="' + p.id + '">+</button>' +
        "</div>"
      : '<button class="product-view__add" data-inc="' + p.id + '">Agregar al carrito</button>';

    var incBtn = els.pvStepperWrap.querySelector("[data-inc]");
    var decBtn = els.pvStepperWrap.querySelector("[data-dec]");
    if (incBtn) incBtn.addEventListener("click", function () { bump(p.id, 1); renderProductStepper(); });
    if (decBtn) decBtn.addEventListener("click", function () { bump(p.id, -1); renderProductStepper(); });
  }

  function renderProductSpecs(p) {
    var puffs = parsePuffs(p.cat);
    var rows = [
      ["Marca", p.cat.split(" ")[0]],
      ["Línea", p.cat],
      ["Sabor", p.flavor]
    ];
    if (puffs) rows.push(["Rendimiento aprox.", puffs + " pitadas"]);
    rows.push(["Uso", "Descartable, listo para usar"]);

    els.pvSpecs.innerHTML = rows.map(function (r) {
      return "<tr><th>" + escapeHtml(r[0]) + "</th><td>" + escapeHtml(r[1]) + "</td></tr>";
    }).join("");
  }

  function renderRelated(p) {
    var sameCat = PRODUCTS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; });
    var others = PRODUCTS.filter(function (x) { return x.cat !== p.cat && x.id !== p.id; });
    var list = sameCat.concat(others).slice(0, 4);

    els.pvRelated.innerHTML = list.map(function (rp) {
      return '<a class="card product-view__related-card" href="#/p/' + rp.id + '">' +
        '<div class="card__image">' +
          '<div class="img-slot">' + VAPE_ICON + "</div>" +
          '<div class="card__cat">' + escapeHtml(rp.cat) + "</div>" +
        "</div>" +
        '<div class="card__flavor">' + escapeHtml(rp.flavor) + "</div>" +
        '<div class="card__row"><span class="card__price">' + money(rp.price) + "</span></div>" +
      "</a>";
    }).join("");
  }

  function renderProductView(id) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;

    state.product = id;
    els.pvCat.textContent = p.cat;
    els.pvFlavor.textContent = p.flavor;
    els.pvPrice.textContent = money(p.price);
    els.pvDesc.textContent = productDescription(p);
    els.pvWhatsapp.href = "https://wa.me/" + WA + "?text=" +
      encodeURIComponent("Hola! Quiero consultar por " + p.cat + " " + p.flavor + " (" + money(p.price) + ").");

    renderProductStepper();
    renderProductSpecs(p);
    renderRelated(p);

    els.productView.classList.remove("is-visible");
    void els.productView.offsetWidth;
    els.productView.classList.add("is-visible");

    window.scrollTo(0, 0);
  }

  function showCatalogView() {
    els.catalogView.hidden = false;
    els.productView.hidden = true;
  }

  function showProductView(id) {
    els.catalogView.hidden = true;
    els.productView.hidden = false;
    renderProductView(id);
  }

  function handleRoute() {
    var match = location.hash.match(/^#\/p\/([\w-]+)/);
    var product = match && PRODUCTS.filter(function (x) { return x.id === match[1]; })[0];
    if (product) {
      showProductView(product.id);
    } else {
      showCatalogView();
    }
  }

  // Static content wiring
  els.search.addEventListener("input", function (e) {
    state.query = e.target.value;
    renderGrid();
  });

  els.cartbarCta.addEventListener("click", openCheckout);
  els.headerCart.addEventListener("click", openCheckout);
  els.checkoutClose.addEventListener("click", closeAll);
  els.sentReset.addEventListener("click", resetAll);

  els.fieldName.addEventListener("input", function (e) {
    state.name = e.target.value;
    renderMessage();
  });

  els.fieldAddr.addEventListener("input", function (e) {
    state.addr = e.target.value;
    renderMessage();
  });

  els.pickEnvio.addEventListener("click", function () {
    state.ship = "envio";
    renderShipUI();
    renderMessage();
  });

  els.pickRetiro.addEventListener("click", function () {
    state.ship = "retiro";
    renderShipUI();
    renderMessage();
  });

  els.checkoutSend.addEventListener("click", function () {
    setTimeout(function () {
      state.view = "sent";
      els.checkoutOverlay.hidden = true;
      els.sentOverlay.hidden = false;
    }, 300);
  });

  window.addEventListener("hashchange", handleRoute);

  var preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.addEventListener("animationend", function (e) {
      if (e.animationName === "preloaderSplitL" || e.animationName === "preloaderSplitR") {
        preloader.remove();
      }
    });
  }

  var heroCarousel = document.getElementById("hero-carousel");
  var heroDots = document.getElementById("hero-carousel-dots");
  if (heroCarousel && heroDots) {
    var slides = Array.prototype.slice.call(heroCarousel.querySelectorAll(".hero-carousel__slide"));
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = 0;
    var timer = null;

    var dots = slides.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hero-carousel__dot" + (i === 0 ? " is-active" : "");
      b.setAttribute("aria-label", "Ver imagen " + (i + 1));
      b.addEventListener("click", function () {
        goTo(i);
        restart();
      });
      heroDots.appendChild(b);
      return b;
    });

    function goTo(i) {
      slides[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      current = (i + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      dots[current].classList.add("is-active");
    }

    function restart() {
      if (timer) clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(function () {
        goTo(current + 1);
      }, 3200);
    }

    restart();
    heroCarousel.addEventListener("mouseenter", function () {
      if (timer) clearInterval(timer);
    });
    heroCarousel.addEventListener("mouseleave", restart);
  }

  // Initial render
  renderTabs();
  renderGrid();
  renderCartBar();
  handleRoute();
})();
