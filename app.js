const { getCollectionFilters, normalizeFilter, validateCollection, selectSets, getRetailerUrls } = globalThis.LegoCollection;

const $ = selector => document.querySelector(selector);
const grid = $("#set-grid");
const filters = [...document.querySelectorAll("[data-status]")];
const search = $("#search");
const sort = $("#sort");
const localFile = location.protocol === "file:";
const params = new URLSearchParams(localFile ? location.hash.slice(1) : location.search);
const state = {
  status: normalizeFilter(params.get("status")),
  query: params.get("q") ?? "",
  sort: [...sort.options].some(option => option.value === params.get("sort")) ? params.get("sort") : "name",
};
let collection;
let collectionFilters;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");

function updateUrl() {
  const url = new URL(location.href);
  const params = new URLSearchParams(localFile ? url.hash.slice(1) : url.search);
  for (const [key, value, defaultValue] of [["status", state.status, "wishlist"], ["q", state.query, ""], ["sort", state.sort, "name"]]) {
    if (value !== defaultValue) params.set(key, value);
    else params.delete(key);
  }
  if (localFile) url.hash = params.toString();
  else url.search = params.toString();
  history.replaceState(null, "", url);
}

function render() {
  if (!collection) return;
  const wishlist = state.status === "wishlist";
  const christmas = wishlist && collection.wishlist.theme === "christmas";
  document.body.classList.toggle("christmas-theme", christmas);
  $("#christmas-header").hidden = !christmas;
  $('meta[name="theme-color"]').setAttribute("content", christmas ? "#164c3e" : "#0055bf");
  search.value = state.query;
  sort.value = state.sort;
  for (const button of filters) {
    const active = button.dataset.status === state.status;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const sets = selectSets(collection.sets, state);
  const fragment = document.createDocumentFragment();
  for (const set of sets) {
    const card = $("#set-template").content.cloneNode(true);
    const unavailable = wishlist && Boolean(set.wishlistGift) && set.status === "reserved";
    card.querySelector(".set-card").classList.toggle("is-unavailable", unavailable);
    const image = card.querySelector("img");
    image.src = set.image;
    image.alt = set.name;
    image.addEventListener("error", () => {
      image.hidden = true;
      const fallback = image.closest(".card-image").querySelector(".image-error");
      fallback.hidden = false;
      fallback.textContent = `Image unavailable for set ${set.id}`;
      console.error(`Unable to load set image: ${set.image}`);
    }, { once: true });
    for (const link of card.querySelectorAll(".image-link, .set-title-link")) link.href = set.legoUrl;
    card.querySelector(".set-title-link").textContent = set.name;
    const retailerUrls = getRetailerUrls(set);
    for (const link of card.querySelectorAll("[data-retailer]")) {
      const retailer = link.dataset.retailer;
      link.href = retailerUrls[retailer];
      const action = retailer === "target" && set.targetUrl ? "View" : "Search for";
      const retailerName = retailer === "amazon" ? "Amazon" : "Target";
      const label = `${action} ${set.name}, set ${set.id}, at ${retailerName} (opens in a new tab)`;
      link.setAttribute("aria-label", label);
      link.title = label;
    }
    const pieces = set.pieces === undefined ? "Piece count unavailable" : `${number.format(set.pieces)} pieces`;
    card.querySelector(".set-meta").textContent = `LEGO ${set.theme === "LEGO" ? "" : set.theme} / #${set.id} / ${pieces}`;
    const gift = card.querySelector(".wishlist-gift");
    gift.hidden = !set.wishlistGift;
    gift.classList.toggle("is-bought", set.status === "reserved");
    gift.textContent = !set.wishlistGift ? "" : set.status === "reserved"
      ? "Already Bought"
      : set.wishlistGift === "planned"
        ? "Planned"
        : "Idea";
    const price = card.querySelector(".set-price");
    price.textContent = set.price === undefined ? "Price not listed" : money.format(set.price);
    price.classList.toggle("price-unknown", set.price === undefined);
    price.title = "Recorded reference price, not a live store price.";
    const notes = card.querySelector(".set-notes");
    notes.hidden = !set.notes;
    notes.querySelector("p").textContent = set.notes ?? "";
    if (set.quantity > 1) {
      const quantity = card.querySelector(".quantity-badge");
      quantity.hidden = false;
      quantity.textContent = `x${set.quantity}`;
      quantity.setAttribute("aria-label", `${set.quantity} copies owned`);
    }
    if (unavailable) {
      for (const link of card.querySelectorAll("a")) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.tabIndex = -1;
        link.title = "Already bought; no need to purchase again.";
      }
    }
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
  grid.setAttribute("aria-busy", "false");
  $("#empty-state").hidden = sets.length !== 0;
  $("#status-explanation").hidden = false;
  $("#status-explanation").textContent = collectionFilters[state.status].description;
}

function reset() {
  state.query = "";
  updateUrl();
  render();
}

for (const button of filters) button.addEventListener("click", () => {
  state.status = button.dataset.status;
  updateUrl();
  render();
});
search.addEventListener("input", () => {
  state.query = search.value;
  updateUrl();
  render();
});
sort.addEventListener("change", () => {
  state.sort = sort.value;
  updateUrl();
  render();
});
$("#empty-reset").addEventListener("click", reset);
$("#retry").addEventListener("click", load);
let snowPaused = false;
$("#snow-toggle").addEventListener("click", () => {
  snowPaused = !snowPaused;
  document.body.classList.toggle("snow-paused", snowPaused);
  $("#snow-toggle").setAttribute("aria-pressed", String(snowPaused));
  $("#snow-toggle").textContent = snowPaused ? "Resume snow" : "Pause snow";
});

function load() {
  $("#error-state").hidden = true;
  grid.setAttribute("aria-busy", "true");
  try {
    collection = validateCollection(globalThis.LEGO_COLLECTION);
    collectionFilters = getCollectionFilters(collection);
    for (const button of filters) {
      button.querySelector("[data-filter-label]").textContent = collectionFilters[button.dataset.status].label;
    }
    for (const count of document.querySelectorAll("[data-count]")) {
      count.textContent = selectSets(collection.sets, { status: count.dataset.count }).length;
    }
    $("#updated-at").textContent = `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${collection.updatedAt}T00:00:00Z`))}`;
    render();
  } catch (error) {
    console.error("Collection loading failed:", error);
    grid.setAttribute("aria-busy", "false");
    $("#error-state").hidden = false;
    $("#error-message").textContent = `Please check data/collection-data.js and keep the site's files together. ${error.message}`;
  }
}
load();
