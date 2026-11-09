import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import "../collection.js";
import "../data/collection-data.js";

const root = new URL("../", import.meta.url);
const { statuses, getCollectionFilters, normalizeFilter, validateCollection, selectSets, getRetailerUrls } = globalThis.LegoCollection;
const data = globalThis.LEGO_COLLECTION;
const collectionFilters = getCollectionFilters(data);

test("collection is valid and source entries are deduplicated by set number", () => {
  assert.equal(validateCollection(data), data);
  assert.equal(data.sets.length, 53);
  assert.deepEqual(Object.fromEntries(Object.keys(statuses).map(status => [status, selectSets(data.sets, { status }).length])), {
    owned: 30, ideas: 16, reserved: 7,
  });
  assert.equal(data.sets.find(set => set.id === "60450").quantity, 2);
  assert.equal(data.sets.find(set => set.id === "42235").name, "Ferrari 488 Pista Car");
  assert.equal(data.sets.find(set => set.id === "42235").status, "owned");
  assert.equal(data.sets.find(set => set.id === "42235").notes, "Fifth birthday gift from Howard, Hannah, and Janet.");
  assert.equal(data.sets.find(set => set.id === "60316").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60316").notes, "Gramma/Grampa gave this to E for his fifth birthday.");
  assert.equal(data.sets.find(set => set.id === "60480").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60495").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60492").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60503").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60503").notes, "Birthday gift from Ama.");
  assert.equal(data.sets.find(set => set.id === "60478").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60373").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60373").notes, "Birthday gift from Jordan and Cole.");
  assert.equal(data.sets.find(set => set.id === "60508").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60508").notes, "Baba will be getting this for E for Thanksgiving.");
  assert.equal(data.sets.find(set => set.id === "60499").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60499").notes, "Mama/Baba gave this to E for his fifth birthday.");
  assert.equal(data.sets.find(set => set.id === "60490").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60490").notes, "Gramma/Grampa bought this for Christmas 2026.");
  assert.equal(data.sets.find(set => set.id === "60494").status, "ideas");
  assert.equal(data.sets.find(set => set.id === "60494").notes, "Baba/Mama might give this to E for Christmas 2026. Not reserved or confirmed.");
  assert.equal(data.sets.find(set => set.id === "60494").price, 129.99);
  assert.equal(data.sets.find(set => set.id === "60498").price, 19.99);
  assert.equal(data.sets.find(set => set.id === "60490").price, 27.99);
});

test("the newer main F1 Display Truck entry remains an idea outside the curated wishlist", () => {
  const set = data.sets.find(set => set.id === "60493");
  assert.equal(set.name, "F1 Display Truck with Audi F1 Race Car");
  assert.equal(set.status, "ideas");
  assert.equal(set.price, 44.99);
  assert.equal(set.pieces, 508);
  assert.equal(set.notes, "On E's Christmas 2026 wish list. Steve saw it in store in November 2026; LEGO lists the set as retiring soon.");
  assert.equal(set.wishlistGift, undefined);
  assert.equal(selectSets(data.sets, { status: normalizeFilter("suspected"), query: "60493" })[0], set);
  assert.equal(selectSets(data.sets, { status: "wishlist", query: "60493" }).length, 0);
  assert.equal(data.updatedAt, "2026-11-08");
});

test("each set has a real, local product image", async () => {
  for (const set of data.sets) {
    const image = await readFile(new URL(set.image, root));
    assert.ok(image.length > 1000, `${set.id}: image is empty`);
    assert.equal(image.subarray(0, 2).toString("hex"), "ffd8", `${set.id}: not a JPEG`);
  }
});

test("case-insensitive, multi-term search combines with status and handles whitespace", () => {
  assert.equal(selectSets(data.sets, { query: "  60337 " })[0].name, "Express Passenger Train");
  assert.equal(selectSets(data.sets, { query: "TRAIN passenger" })[0].id, "60337");
  assert.equal(selectSets(data.sets, { query: "recycling" }).length, 2);
  assert.equal(selectSets(data.sets, { query: "recycling", status: "reserved" })[0].id, "60386");
  assert.equal(selectSets(data.sets, { query: "no-such-set" }).length, 0);
  assert.equal(selectSets(data.sets, { query: "   " }).length, data.sets.length);
  assert.ok(selectSets(data.sets, { query: "Technic" }).every(set => set.theme === "Technic"));
  assert.ok(selectSets(data.sets, { query: "Ama" }).length > 0);
});

test("sorts prices numerically with unknown prices last and never mutates input", () => {
  const sets = [{ id: "3", name: "Unknown" }, { id: "1", name: "B", price: 30 }, { id: "2", name: "A", price: 9.99 }];
  assert.deepEqual(selectSets(sets, { sort: "price-asc" }).map(set => set.id), ["2", "1", "3"]);
  assert.deepEqual(selectSets(sets, { sort: "price-desc" }).map(set => set.id), ["1", "2", "3"]);
  assert.deepEqual(selectSets(sets, { sort: "number" }).map(set => set.id), ["1", "2", "3"]);
  assert.deepEqual(sets.map(set => set.id), ["3", "1", "2"]);
});

test("invalid data fails explicitly", () => {
  assert.throws(() => validateCollection({}), /metadata/);
  const copy = structuredClone(data);
  copy.sets.push(copy.sets[0]);
  assert.throws(() => validateCollection(copy), /duplicate/);
  for (const change of [{ status: "maybe" }, { price: -1 }, { quantity: 0 }, { pieces: 0 }, { pieces: -1 }, { pieces: 1.5 }, { pieces: "204" }, { image: "../private.jpg" }, { legoUrl: "javascript:alert(1)" },
    { wishlistGift: "maybe" }, { wishlistGift: "planned" }, { targetUrl: "javascript:alert(1)" }, { targetUrl: "https://www.target.com.evil.example/p/tractor/-/A-94756903" }]) {
    const invalid = structuredClone(data);
    Object.assign(invalid.sets[0], change);
    assert.throws(() => validateCollection(invalid), /Invalid/);
  }
});

test("retailer links use the LEGO product page and set-specific retailer searches", () => {
  for (const set of data.sets) {
    const urls = getRetailerUrls(set);
    assert.equal(urls.lego, set.legoUrl);
    const amazon = new URL(urls.amazon);
    assert.equal(amazon.origin, "https://www.amazon.com");
    assert.equal(amazon.pathname, "/s");
    assert.equal(amazon.searchParams.get("k"), `LEGO ${set.id}`);
    const target = new URL(urls.target);
    assert.equal(target.origin, "https://www.target.com");
    if (set.id === "60498") {
      assert.equal(urls.target, "https://www.target.com/p/lego-city-tractor-building-toy-for-kids-60498/-/A-94756903#lnk=sametab");
    } else {
      assert.equal(target.pathname, "/s");
      assert.equal(target.searchParams.get("searchTerm"), `LEGO ${set.id}`);
    }
  }
});

test("required static files exist", async () => {
  for (const path of ["index.html", "styles.css", "app.js", "collection.js", "data/collection-data.js", "favicon.svg"]) {
    assert.ok((await stat(new URL(path, root))).size > 0);
  }
});

test("collection notes are plain text rather than a collapsible disclosure", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<div class="set-notes"><p><\/p><\/div>/);
  assert.doesNotMatch(html, /<details\b|<summary\b/);
});

test("category filters default to Christmas Wishlist without an all-sets view", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const filters = [...html.matchAll(/<button class="filter[^"]*" data-status="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(filters, Object.keys(collectionFilters));
  assert.match(html, /class="filter active" data-status="wishlist" aria-pressed="true"/);
  assert.match(html, /id="empty-reset">Clear search<\/button>/);
  assert.doesNotMatch(html, /data-status="all"|data-count="all"|Show all sets/);
  assert.doesNotMatch(html, /data-status="wanted"|data-status="suspected"|Explicitly desired|Suspected desired/);
  assert.deepEqual(Object.keys(collectionFilters), ["wishlist", "owned", "ideas", "reserved"]);
});

test("Christmas Wishlist includes only current tagged gifts and suggestions", () => {
  assert.deepEqual(selectSets(data.sets, { status: "wishlist", sort: "number" }).map(set => set.id), ["60467", "60490", "60494", "60498"]);
  assert.deepEqual(selectSets(data.sets, { status: "wishlist", query: "Gramma" }).map(set => set.id).sort(), ["60467", "60490"]);
  assert.equal(selectSets(data.sets, { status: "wishlist", query: "tractor" })[0].id, "60498");
  assert.equal(selectSets(data.sets, { status: "wishlist", query: "Thanksgiving" }).length, 0);
  assert.equal(selectSets([{ ...data.sets.find(set => set.id === "60498"), status: "owned" }], { status: "wishlist" }).length, 0);
});

test("app renders the wishlist by default and preserves explicit URL filters on HTTP and local files", async () => {
  const source = await readFile(new URL("app.js", root), "utf8");
  function element(dataset = {}) {
    const children = new Map();
    return {
      dataset, textContent: "", hidden: false, value: "", attributes: {}, events: {},
      classList: {
        values: new Set(),
        toggle(name, active) { if (active) this.values.add(name); else this.values.delete(name); },
      },
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; if (key === "href") delete this.href; },
      addEventListener(key, handler) { this.events[key] = handler; },
      querySelector(selector) {
        if (!children.has(selector)) children.set(selector, element());
        return children.get(selector);
      },
      querySelectorAll(selector) {
        if (selector === ".image-link, .set-title-link") return [this.querySelector(".image-link"), this.querySelector(".set-title-link")];
        if (selector === "a") return [...this.querySelectorAll(".image-link, .set-title-link"), ...this.querySelectorAll("[data-retailer]")];
        if (selector === "[data-retailer]") return ["amazon", "target"].map(retailer => {
          const link = this.querySelector(retailer);
          link.dataset.retailer = retailer;
          return link;
        });
        return [];
      },
      replaceChildren(fragment) { this.cards = fragment.children; },
    };
  }
  for (const wishlist of [
    data.wishlist,
    { label: "Birthday Wishlist", description: "Birthday gifts and ideas for E.", theme: "default" },
    { label: "Winter Birthday", description: "Birthday gifts and ideas for E.", theme: "christmas" },
  ]) {
  const configuredData = { ...data, wishlist };
  const configuredFilters = getCollectionFilters(configuredData);
  for (const base of ["https://example.com/index.html", "file:///collection/index.html"]) {
    for (const status of [null, "invalid", "wishlist", "ideas", "christmas", "owned", "reserved", "wanted", "suspected"]) {
      const location = new URL(base);
      if (status) location[location.protocol === "file:" ? "hash" : "search"] = `status=${status}`;
      const page = element();
      const buttons = Object.keys(collectionFilters).map(status => element({ status }));
      const counts = Object.keys(collectionFilters).map(count => element({ count }));
      page.querySelector("#sort").options = ["name", "number", "price-asc", "price-desc"].map(value => ({ value }));
      page.querySelector("#set-template").content = { cloneNode: () => element() };
      let updatedUrl;
      runInNewContext(source, {
        LegoCollection: globalThis.LegoCollection, LEGO_COLLECTION: configuredData, location, URL, URLSearchParams, Intl, console,
        history: { replaceState: (_state, _title, url) => { updatedUrl = url; } },
        document: {
          body: page,
          querySelector: selector => page.querySelector(selector),
          querySelectorAll: selector => selector === "[data-status]" ? buttons : counts,
          createDocumentFragment: () => ({ children: [], append(card) { this.children.push(card); } }),
        },
      });
      const selected = normalizeFilter(status);
      const winter = selected === "wishlist" && wishlist.theme === "christmas";
      assert.equal(page.classList.values.has("christmas-theme"), winter);
      assert.equal(page.querySelector("#christmas-header").hidden, !winter);
      assert.equal(page.querySelector('meta[name="theme-color"]').attributes.content, winter ? "#164c3e" : "#0055bf");
      assert.equal(buttons.find(button => button.attributes["aria-pressed"] === "true").dataset.status, selected);
      assert.equal(page.querySelector("#status-explanation").textContent, configuredFilters[selected].description);
      assert.equal(buttons[0].querySelector("[data-filter-label]").textContent, wishlist.label);
      assert.equal(buttons.find(button => button.dataset.status === "ideas").querySelector("[data-filter-label]").textContent, "Ideas");
      assert.equal(page.querySelector("#set-grid").cards.length, selectSets(data.sets, { status: selected }).length);
      assert.equal(counts.find(count => count.dataset.count === "wishlist").textContent, 4);
      for (const card of page.querySelector("#set-grid").cards) {
        const meta = card.querySelector(".set-meta").textContent;
        const set = data.sets.find(set => meta.includes(`#${set.id} /`));
        assert.ok(set);
        assert.ok(meta.endsWith(`${new Intl.NumberFormat("en-US").format(set.pieces)} pieces`));
        assert.equal(card.querySelector(".set-price").textContent, set.price === undefined
          ? "Price not listed"
          : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(set.price));
        const bought = card.querySelector(".wishlist-gift").textContent === "Already Bought";
        const unavailable = selected === "wishlist" && bought;
        assert.equal(card.querySelector(".set-card").classList.values.has("is-unavailable"), unavailable);
        for (const link of card.querySelectorAll("a")) {
          assert.equal(link.attributes["aria-disabled"] === "true", unavailable);
          assert.equal(typeof link.href === "string", !unavailable);
          if (unavailable) assert.equal(link.tabIndex, -1);
        }
        for (const link of card.querySelectorAll("[data-retailer]")) {
          assert.match(link.attributes["aria-label"], /at (Amazon|Target) \(opens in a new tab\)$/);
        }
      }
      if (selected === "wishlist") {
        const cards = page.querySelector("#set-grid").cards;
        assert.deepEqual(cards.map(card => card.querySelector(".wishlist-gift").textContent), [
          "Planned",
          "Already Bought",
          "Already Bought",
          "Idea",
        ]);
        assert.deepEqual(cards.map(card => card.querySelector(".wishlist-gift").classList.values.has("is-bought")), [false, true, true, false]);
        assert.match(cards[3].querySelector("target").attributes["aria-label"], /^View Tractor/);
      }
      buttons.find(button => button.dataset.status === "owned").events.click();
      assert.equal(page.classList.values.has("christmas-theme"), false);
      assert.equal(page.querySelector("#christmas-header").hidden, true);
      assert.equal(page.querySelector('meta[name="theme-color"]').attributes.content, "#0055bf");
      assert.equal(new URLSearchParams(location.protocol === "file:" ? updatedUrl.hash.slice(1) : updatedUrl.search).get("status"), "owned");
      buttons[0].events.click();
      assert.equal(page.classList.values.has("christmas-theme"), wishlist.theme === "christmas");
      assert.equal(page.querySelector("#christmas-header").hidden, wishlist.theme !== "christmas");
      assert.equal(new URLSearchParams(location.protocol === "file:" ? updatedUrl.hash.slice(1) : updatedUrl.search).has("status"), false);
      page.querySelector("#search").value = "no-such-set";
      page.querySelector("#search").events.input();
      assert.equal(page.querySelector("#empty-state").hidden, false);
      page.querySelector("#empty-reset").events.click();
      assert.equal(page.querySelector("#set-grid").cards.length, 4);
      page.querySelector("#snow-toggle").events.click();
      assert.equal(page.classList.values.has("snow-paused"), true);
      assert.equal(page.querySelector("#snow-toggle").attributes["aria-pressed"], "true");
      assert.equal(page.querySelector("#snow-toggle").textContent, "Resume snow");
      page.querySelector("#snow-toggle").events.click();
      assert.equal(page.classList.values.has("snow-paused"), false);
      assert.equal(page.querySelector("#snow-toggle").textContent, "Pause snow");
    }
  }
  }
});

test("wishlist configuration can be rebranded independently of its theme and membership", () => {
  for (const occasion of ["Birthday", "Thanksgiving", "Christmas", "Easter"]) {
    const copy = structuredClone(data);
    copy.wishlist = { label: `${occasion} Wishlist`, description: `${occasion} gifts for E.`, theme: "default" };
    assert.equal(validateCollection(copy), copy);
    assert.equal(getCollectionFilters(copy).wishlist.label, `${occasion} Wishlist`);
    assert.equal(selectSets(copy.sets, { status: "wishlist" }).length, 4);
    delete copy.sets.find(set => set.id === "60498").wishlistGift;
    copy.sets.find(set => set.id === "60451").wishlistGift = "suggestion";
    const ids = selectSets(copy.sets, { status: "wishlist" }).map(set => set.id);
    assert.ok(ids.includes("60451"));
    assert.ok(!ids.includes("60498"));
    assert.equal(selectSets(copy.sets, { status: "ideas" }).length, 16);
  }
  for (const wishlist of [undefined, {}, { ...data.wishlist, label: "" }, { ...data.wishlist, description: 123 }, { ...data.wishlist, theme: "easter" }]) {
    assert.throws(() => validateCollection({ ...data, wishlist }), /wishlist configuration/);
  }
  for (const [old, current] of [["christmas", "wishlist"], ["wanted", "wishlist"], ["suspected", "ideas"]]) {
    assert.equal(normalizeFilter(old), current);
  }
});

test("every current set has a positive piece count, recorded per copy", () => {
  assert.ok(data.sets.every(set => Number.isInteger(set.pieces) && set.pieces > 0));
  const expected = { "60498": 204, "60494": 1132, "60490": 263, "60467": 793, "60503": 551, "60499": 691, "60450": 81 };
  for (const [id, pieces] of Object.entries(expected)) {
    assert.equal(data.sets.find(set => set.id === id).pieces, pieces);
  }
  const withoutPieces = structuredClone(data);
  delete withoutPieces.sets[0].pieces;
  assert.equal(validateCollection(withoutPieces), withoutPieces);
});

test("snowfall is decorative and the original-list header link is removed", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.doesNotMatch(html, /id="source-link"|The original list/);
  assert.match(html, /class="snowfall" aria-hidden="true"/);
  assert.match(html, /id="snow-toggle" type="button" aria-pressed="false"/);
  assert.doesNotMatch(html, /christmas-banner|Big wishes/);
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)[1];
  assert.match(header, /id="christmas-header"/);
  assert.match(header, /class="christmas-art"/);
  assert.match(header, /id="snow-toggle"/);
});

test("Christmas gift labels appear at the top of the card, before its image", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<article class="set-card">\s*<p class="wishlist-gift" hidden><\/p>\s*<div class="card-image">/);
});

test("retailer links use local Amazon and Target logos without a duplicate LEGO link", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.doesNotMatch(html, /data-retailer="lego"/);
  for (const retailer of ["amazon", "target"]) {
    assert.match(html, new RegExp(`data-retailer="${retailer}"[^>]*><img src="images/${retailer}\\.svg"[^>]*alt=""`));
    const svg = await readFile(new URL(`images/${retailer}.svg`, root), "utf8");
    assert.match(svg, /<svg\b/);
  }
});

test("short category descriptions sit directly below the tabs, above search and sorting", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /<\/button>\s*<\/div>\s*<p class="status-explanation" id="status-explanation" hidden><\/p>\s*<div class="collection-tools">/);
  for (const filter of Object.values(collectionFilters)) {
    assert.ok(filter.description.length <= 75);
  }
});

test("page uses ordered classic scripts and no runtime data fetch", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1]);
  assert.deepEqual(scripts, ["data/collection-data.js", "collection.js", "app.js"]);
  assert.doesNotMatch(html, /type=["']module["']/);
  for (const script of scripts) {
    const source = await readFile(new URL(script, root), "utf8");
    assert.doesNotMatch(source, /\b(?:import|export)\s|\bfetch\s*\(/);
  }
  assert.doesNotMatch(html, /href="\.\/"/);
});
