# E's LEGO collection

A static, responsive collection and gift guide. No server, database, API key, build step, or npm dependencies. Set data lives in [`data/collection-data.js`](data/collection-data.js); product images are stored in `images/`.

## Preview

Double-click `index.html`, or open it directly in your browser with a `file:///` URL. Keep the HTML, stylesheet, JavaScript files, and `images/` folder together. Data is loaded as a classic script, not fetched, so no server is needed and the collection works offline. LEGO links require an internet connection; optional Google Fonts use system fallbacks offline.

For an optional HTTP preview, run `npm start` (requires Python 3) and open http://localhost:8080.

## GitHub Pages

Upload this folder's contents to a GitHub repository. In **Settings > Pages**, choose **Deploy from a branch**, select your branch and **/ (root)**, and save. No Actions build or URL configuration is needed. All local URLs are relative, including on project pages such as `username.github.io/legocollection/`.

## Edit the collection

Update `data/collection-data.js` and refresh the page. This file contains the same JSON-shaped collection object, wrapped in `globalThis.LEGO_COLLECTION = { ... };`. Edit the entries in its `sets` array, leaving the assignment intact. There is no separate JSON copy to keep in sync. The Google Doc was imported on October 21, 2026; this site does **not** sync with it automatically.

```json
{
  "id": "60337",
  "name": "Express Passenger Train",
  "theme": "City",
  "status": "owned",
  "price": 190,
  "pieces": 764,
  "notes": "Optional gift or collection notes.",
  "image": "images/60337.jpg",
  "legoUrl": "https://www.lego.com/en-us/product/express-passenger-train-60337"
}
```

Use a unique string set number for `id`. `price` is optional and in USD, `quantity` is optional and defaults to one, and `notes` is optional. Add each new product image to `images/` and use its relative path. Update the top-level `updatedAt` date (`YYYY-MM-DD`). Prices are recorded reference prices, not live prices or availability. Missing prices for Tractor 60498 ($19.99) and Dump Truck & Front End Loader 60494 ($129.99) were filled on November 7, 2026 from the [LEGO US Tractor listing](https://www.lego.com/en-us/product/tractor-60498) and [Bricksly's US MSRP listing](https://bricksly.net/p/lego-dump-truck-front-end-loader-60494), respectively.

Each card displays its piece count beside the set number. `pieces` is an optional positive integer, per set (not multiplied by the number of copies owned); missing values display "Piece count unavailable". Counts for the original 52 sets were checked against [Rebrickable's public set catalog](https://rebrickable.com/downloads/) on November 7, 2026. The newer F1 Display Truck with Audi F1 Race Car 60493 entry is preserved from `main` in Ideas, with its 508 pieces checked against the [LEGO US listing](https://www.lego.com/en-us/product/f1-display-truck-with-audi-f1-race-car-60493) on November 8, 2026. All 53 counts are stored locally, so no live lookup is needed.

Snowplow 60490's $27.99 reference price was added on November 7, 2026 from the [LEGO US listing](https://www.lego.com/en-us/product/snowplow-60490).

| Status | Meaning |
| --- | --- |
| `owned` | E already received the set. |
| `ideas` | Sets to consider for future gifts, whether E asked for them or someone suggested them. |
| `reserved` | Bought or claimed, including unrevealed surprise gifts. |

Confirmed owned entries supersede older might-want entries for the same set number. The backhoe is owned despite an older gift claim. The passenger jet, four hidden gifts, Police Train Heist (Baba's planned Thanksgiving gift), and Snowplow (Gramma/Grampa's Christmas 2026 gift) are reserved. Coast Guard Helicopter (Ama's birthday gift) and Airport Fire Truck (Mama/Baba's fifth birthday gift) are now owned. Police Station is owned: Gramma/Grampa gave it to E for his fifth birthday. Two Yellow Taxi models and two Recycling Truck models are distinct sets. The wheel loader has quantity two.

### Rebrand the wishlist

There is one curated **Wishlist** for the next occasion, alongside **Owned**, **Ideas**, and **Reserved**. It replaces the separate Explicitly desired tab; a wishlist can include both E's requests and family suggestions.

Edit the top-level `wishlist` object in `data/collection-data.js` to rename it throughout the year:

```json
"wishlist": {
  "label": "Birthday Wishlist",
  "description": "Birthday gifts and ideas for E.",
  "theme": "default"
}
```

`label` and `description` are required nonempty strings. `theme` is independently set to `"default"` for the regular LEGO look or `"christmas"` for the winter look. Renaming the list does not change its members or switch its theme automatically.

The current configuration is **Christmas Wishlist** for Christmas 2026: Snowplow and Heavy-Duty Recovery Tow Truck with Crane are bought by Gramma/Grampa, Dump Truck & Front End Loader is an unconfirmed Baba/Mama plan, and Tractor is an aunt/uncle suggestion. Labels at the top of each card distinguish **Already Bought**, **Planned**, and **Idea**; detailed gift notes remain below. Birthday, Thanksgiving, previous Christmas gifts, and other unassigned ideas are not included.

On the Wishlist, already-bought cards have gray product images and crossed-out titles and retailer links regardless of its occasion or theme. Their links are disabled and removed from keyboard navigation to discourage duplicate purchases, while notes remain readable. Other filters retain the normal card appearance and working links.

The Christmas filter also applies a winter theme with a snowy background, evergreen and cranberry accents, and a larger isometric LEGO-style tree-and-presents scene in the header's top right beside a subtle **Pause snow** button. The illustration uses stacked studded bricks, shaded faces, and a snowy baseplate, and scales down on phones. There is no separate Christmas banner. Gentle falling snow is decorative, does not intercept clicks, and can be paused using that button. Falling snow and its control are hidden when reduced motion is preferred. Switching to another filter restores the regular LEGO theme and hides the snowfall and header scene. Decorative artwork is hidden from screen readers. The original Google Doc link is retained in the data file, not displayed in the header.

To include a set in the current wishlist, add `"wishlistGift": "planned"` for a family gift plan or `"wishlistGift": "suggestion"` for an idea or request you want to include. This is separate from its collection `status`; keep purchased/claimed gifts `reserved`, and leave unconfirmed selections `ideas`. The Ideas tab is a pool of potential gifts, not automatic wishlist membership. When switching occasions, remove `wishlistGift` from old selections and add it to the new selections; update their notes as needed. When E receives a gift, remove `wishlistGift` and change its status to `owned`. Only explicitly tagged, unowned sets appear; occasion mentions in historical notes do not qualify.

Search matches names, set numbers, themes, and notes within the selected tab; there is no combined all-sets view. Clearing an empty search keeps that tab and sort order. Filters and sorting are saved in the URL: hosted pages use `?status=owned`, while local files use `index.html#status=owned` to avoid browser restrictions on rewriting file URLs. The stable filter keys are `wishlist`, `owned`, `ideas`, and `reserved`, independent of the occasion. With no status (or an invalid status), the Wishlist opens. Old `status=christmas` and `status=wanted` links select Wishlist; old `status=suspected` links select Ideas. Unknown prices sort last in both price directions.

Filters are centered, tab-style controls with an underline indicating the selected category; they wrap on smaller screens. A short, larger plain-text description sits directly below the tabs, above search and sorting, without a colored callout.

The card's image and title link to its official LEGO product page. Amazon and Target logo links search for `LEGO` plus the exact set number; there is no duplicate LEGO retailer link. The logos are stored locally, with descriptive accessible names and hover titles. An optional `targetUrl` supplies a direct Target product link instead; Tractor uses the provided listing. Retailer searches and product links are not guarantees of availability.

Retailer marks identify their destinations, not an affiliation. The compact Amazon letter-and-smile mark is adapted from the current wordmark on [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Amazon_2024.svg); the simple Target bullseye corresponds to its [public-domain logo](https://commons.wikimedia.org/wiki/File:Target_logo.svg). Both marks remain trademarks of their respective owners.

**Privacy:** GitHub Pages is generally public. The data file and collection notes, including surprise gifts and family names, are downloadable even if a filter hides them. Remove any private details before publishing. This page does not provide private reservations or visitor editing; shared updates must be made in `data/collection-data.js`.

## Checks

Run `npm test` for data validation, local-image integrity, search/filter/sort behavior, and required static assets.

Product images and LEGO trademarks belong to their respective owners. This is an independent family collection, not an official LEGO site. External fonts are optional; the layout uses system fallbacks if Google Fonts is unavailable.
