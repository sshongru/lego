const { statuses, validateCollection, selectSets, getRetailerUrls } = globalThis.LegoCollection;

const $ = selector => document.querySelector(selector);
const grid = $("#set-grid");
const filters = [...document.querySelectorAll("[data-status]")];
const search = $("#search");
const sort = $("#sort");
const localFile = location.protocol === "file:";
const params = new URLSearchParams(localFile ? location.hash.slice(1) : location.search);
const state = {
  status: Object.hasOwn(statuses, params.get("status")) ? params.get("status") : "owned",
  query: params.get("q") ?? "",
  sort: [...sort.options].some(option => option.value === params.get("sort")) ? params.get("sort") : "name",
};
let collection;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function updateUrl() {
  const url = new URL(location.href);
  const params = new URLSearchParams(localFile ? url.hash.slice(1) : url.search);
  for (const [key, value, defaultValue] of [["status", state.status, "owned"], ["q", state.query, ""], ["sort", state.sort, "name"]]) {
    if (value !== defaultValue) params.set(key, value);
    else params.delete(key);
  }
  if (localFile) url.hash = params.toString();
  else url.search = params.toString();
  history.replaceState(null, "", url);
}

function render() {
  if (!collection) return;
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
      const action = retailer === "lego" ? "View" : "Search for";
      const label = `${action} ${set.name}, set ${set.id}, at ${link.textContent} (opens in a new tab)`;
      link.setAttribute("aria-label", label);
      link.title = label;
    }
    card.querySelector(".set-meta").textContent = `LEGO ${set.theme === "LEGO" ? "" : set.theme} / #${set.id}`;
    const price = card.querySelector(".set-price");
    price.textContent = set.price === undefined ? "Price not listed" : money.format(set.price);
    price.classList.toggle("price-unknown", set.price === undefined);
    price.title = "Price recorded in the source document, not a live store price.";
    const notes = card.querySelector(".set-notes");
    notes.hidden = !set.notes;
    notes.querySelector("p").textContent = set.notes ?? "";
    if (set.quantity > 1) {
      const quantity = card.querySelector(".quantity-badge");
      quantity.hidden = false;
      quantity.textContent = `x${set.quantity}`;
      quantity.setAttribute("aria-label", `${set.quantity} copies owned`);
    }
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
  grid.setAttribute("aria-busy", "false");
  $("#empty-state").hidden = sets.length !== 0;
  $("#status-explanation").hidden = false;
  $("#status-explanation").textContent = statuses[state.status].description;
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

function load() {
  $("#error-state").hidden = true;
  grid.setAttribute("aria-busy", "true");
  try {
    collection = validateCollection(globalThis.LEGO_COLLECTION);
    for (const count of document.querySelectorAll("[data-count]")) {
      count.textContent = collection.sets.filter(set => set.status === count.dataset.count).length;
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
