import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import "../collection.js";
import "../data/collection-data.js";

const root = new URL("../", import.meta.url);
const { statuses, validateCollection, selectSets, getRetailerUrls } = globalThis.LegoCollection;
const data = globalThis.LEGO_COLLECTION;

test("collection is valid and source entries are deduplicated by set number", () => {
  assert.equal(validateCollection(data), data);
  assert.equal(data.sets.length, 52);
  assert.deepEqual(Object.fromEntries(Object.keys(statuses).map(status => [status, selectSets(data.sets, { status }).length])), {
    owned: 28, wanted: 0, suspected: 15, reserved: 9,
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
  assert.equal(data.sets.find(set => set.id === "60503").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60503").notes, "Ama is giving this for E's birthday.");
  assert.equal(data.sets.find(set => set.id === "60478").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60373").status, "owned");
  assert.equal(data.sets.find(set => set.id === "60373").notes, "Birthday gift from Jordan and Cole.");
  assert.equal(data.sets.find(set => set.id === "60508").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60508").notes, "Baba will be getting this for E for Thanksgiving.");
  assert.equal(data.sets.find(set => set.id === "60499").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60499").notes, "Reserved for Mama/Baba to give for E's fifth birthday.");
  assert.equal(data.sets.find(set => set.id === "60490").status, "reserved");
  assert.equal(data.sets.find(set => set.id === "60490").notes, "Gramma/Grampa bought this for Christmas 2026.");
  assert.equal(data.sets.find(set => set.id === "60494").status, "suspected");
  assert.equal(data.sets.find(set => set.id === "60494").notes, "Baba/Mama might give this to E for Christmas 2026. Not reserved or confirmed.");
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
  for (const change of [{ status: "maybe" }, { price: -1 }, { quantity: 0 }, { image: "../private.jpg" }, { legoUrl: "javascript:alert(1)" }]) {
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
    assert.equal(target.pathname, "/s");
    assert.equal(target.searchParams.get("searchTerm"), `LEGO ${set.id}`);
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

test("category filters default to owned without an all-sets view", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const filters = [...html.matchAll(/<button class="filter[^"]*" data-status="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(filters, Object.keys(statuses));
  assert.match(html, /class="filter active" data-status="owned" aria-pressed="true"/);
  assert.match(html, /id="empty-reset">Clear search<\/button>/);
  assert.doesNotMatch(html, /data-status="all"|data-count="all"|Show all sets/);
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
