globalThis.LegoCollection = (() => {
  const statuses = {
    owned: { label: "Owned", description: "Already part of E's collection. No need to buy these again!" },
    wanted: { label: "Explicitly desired", description: "E specifically asked for these sets. Gift-giver suggestions with a question mark are not confirmed reservations." },
    suspected: { label: "Suspected desired", description: "Ideas from the might-want list and Steve's suggestions. E hasn't explicitly asked for these." },
    reserved: { label: "Reserved", description: "Already bought or spoken for, including gifts E doesn't know about yet. Please don't purchase duplicates." },
  };

  function validateCollection(data) {
    if (!data || !Array.isArray(data.sets) || !data.sets.length || !/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt) || data.currency !== "USD") {
      throw new Error("The collection data has invalid or missing metadata.");
    }
    const ids = new Set();
    for (const set of data.sets) {
      if (!/^\d{4,7}$/.test(set.id) || ids.has(set.id) || typeof set.name !== "string" || !set.name.trim() ||
          typeof set.theme !== "string" || !set.theme.trim() || !Object.hasOwn(statuses, set.status) ||
          !/^images\/\d{4,7}\.(jpg|png|webp)$/.test(set.image) ||
          typeof set.legoUrl !== "string" || !set.legoUrl.startsWith("https://www.lego.com/en-us/product/") ||
          (set.price !== undefined && (!Number.isFinite(set.price) || set.price < 0)) ||
          (set.quantity !== undefined && (!Number.isInteger(set.quantity) || set.quantity < 1)) ||
          (set.notes !== undefined && typeof set.notes !== "string")) {
        throw new Error(`Invalid or duplicate set in collection data: ${set.id ?? "unknown"}.`);
      }
      ids.add(set.id);
    }
    return data;
  }

  function selectSets(sets, { status = "all", query = "", sort = "name" } = {}) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return sets.filter(set => {
      const text = `${set.name} ${set.id} ${set.theme} ${set.notes ?? ""}`.toLowerCase();
      return (status === "all" || set.status === status) && terms.every(term => text.includes(term));
    }).sort((a, b) => {
      if (sort === "number") return Number(a.id) - Number(b.id);
      if (sort.startsWith("price-")) {
        if (a.price === undefined && b.price !== undefined) return 1;
        if (b.price === undefined && a.price !== undefined) return -1;
        if (a.price !== undefined && b.price !== undefined && a.price !== b.price) {
          return sort === "price-asc" ? a.price - b.price : b.price - a.price;
        }
      }
      return a.name.localeCompare(b.name) || Number(a.id) - Number(b.id);
    });
  }

  function getRetailerUrls(set) {
    const query = `LEGO ${set.id}`;
    return {
      lego: set.legoUrl,
      amazon: `https://www.amazon.com/s?${new URLSearchParams({ k: query })}`,
      target: `https://www.target.com/s?${new URLSearchParams({ searchTerm: query })}`,
    };
  }

  return { statuses, validateCollection, selectSets, getRetailerUrls };
})();
