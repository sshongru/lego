globalThis.LegoCollection = (() => {
  const statuses = {
    owned: { label: "Owned", description: "Sets already in E's possession" },
    ideas: { label: "Ideas", description: "Sets E might enjoy, ready to consider for a future wishlist." },
    reserved: { label: "Reserved", description: "Already bought or spoken for." },
  };
  function getCollectionFilters(data) {
    return {
      wishlist: { label: data.wishlist.label, description: data.wishlist.description },
      ...statuses,
    };
  }

  function normalizeFilter(status) {
    if (status === "christmas" || status === "wanted") return "wishlist";
    if (status === "suspected") return "ideas";
    return status === "wishlist" || Object.hasOwn(statuses, status) ? status : "wishlist";
  }

  function validateCollection(data) {
    if (!data || !Array.isArray(data.sets) || !data.sets.length || !/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt) || data.currency !== "USD") {
      throw new Error("The collection data has invalid or missing metadata.");
    }
    if (!data.wishlist || typeof data.wishlist.label !== "string" || !data.wishlist.label.trim() ||
        typeof data.wishlist.description !== "string" || !data.wishlist.description.trim() ||
        !["default", "christmas"].includes(data.wishlist.theme)) {
      throw new Error("The wishlist configuration needs a label, description, and a supported theme (default or christmas).");
    }
    const ids = new Set();
    for (const set of data.sets) {
      if (!/^\d{4,7}$/.test(set.id) || ids.has(set.id) || typeof set.name !== "string" || !set.name.trim() ||
          typeof set.theme !== "string" || !set.theme.trim() || !Object.hasOwn(statuses, set.status) ||
          !/^images\/\d{4,7}\.(jpg|png|webp)$/.test(set.image) ||
          typeof set.legoUrl !== "string" || !set.legoUrl.startsWith("https://www.lego.com/en-us/product/") ||
          (set.price !== undefined && (!Number.isFinite(set.price) || set.price < 0)) ||
          (set.pieces !== undefined && (!Number.isInteger(set.pieces) || set.pieces < 1)) ||
          (set.quantity !== undefined && (!Number.isInteger(set.quantity) || set.quantity < 1)) ||
          (set.notes !== undefined && typeof set.notes !== "string") ||
          (set.wishlistGift !== undefined && (!["planned", "suggestion"].includes(set.wishlistGift) || set.status === "owned")) ||
          (set.targetUrl !== undefined && (typeof set.targetUrl !== "string" || !/^https:\/\/www\.target\.com\/p\/[^?#]+\/-\/A-\d+(?:[?#].*)?$/.test(set.targetUrl)))) {
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
      const matchesStatus = status === "all" || (status === "wishlist"
        ? set.wishlistGift !== undefined && set.status !== "owned"
        : set.status === status);
      return matchesStatus && terms.every(term => text.includes(term));
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
      target: set.targetUrl ?? `https://www.target.com/s?${new URLSearchParams({ searchTerm: query })}`,
    };
  }

  return { statuses, getCollectionFilters, normalizeFilter, validateCollection, selectSets, getRetailerUrls };
})();
