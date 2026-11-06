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
  "notes": "Optional gift or collection notes.",
  "image": "images/60337.jpg",
  "legoUrl": "https://www.lego.com/en-us/product/express-passenger-train-60337"
}
```

Use a unique string set number for `id`. `price` is optional and in USD, `quantity` is optional and defaults to one, and `notes` is optional. Add each new product image to `images/` and use its relative path. Update the top-level `updatedAt` date (`YYYY-MM-DD`). Prices are source-document reference prices, not live prices or availability.

| Status | Meaning |
| --- | --- |
| `owned` | E already received the set. |
| `wanted` | E explicitly asked for it. |
| `suspected` | A might-want entry or a suggested gift, not an explicit request. |
| `reserved` | Bought or claimed, including unrevealed surprise gifts. |

Confirmed owned entries supersede older might-want entries for the same set number. The backhoe is owned despite an older gift claim. The passenger jet, four hidden gifts, Coast Guard Helicopter (Ama's birthday gift), Police Train Heist (Baba's planned Thanksgiving gift), Airport Fire Truck (Mama/Baba's fifth birthday gift), and Snowplow (Gramma/Grampa's Christmas 2026 gift) are reserved. Police Station is owned: Gramma/Grampa gave it to E for his fifth birthday. Two Yellow Taxi models and two Recycling Truck models are distinct sets. The wheel loader has quantity two.

The page opens to Owned, with separate filters for explicitly desired, suspected desired, and reserved sets; there is no combined all-sets view. Search matches names, set numbers, themes, and notes within the selected category. Clearing an empty search keeps that category and sort order. Filters and sorting are saved in the URL: hosted pages use `?status=wanted`, while local files use `index.html#status=wanted` to avoid browser restrictions on rewriting file URLs. Unknown prices sort last in both price directions.

Each card links to the official LEGO product page and to Amazon and Target searches for `LEGO` plus the exact set number. Retailer searches are not verified product listings or guarantees of availability.

**Privacy:** GitHub Pages is generally public. The data file and collection notes, including surprise gifts and family names, are downloadable even if a filter hides them. Remove any private details before publishing. This page does not provide private reservations or visitor editing; shared updates must be made in `data/collection-data.js`.

## Checks

Run `npm test` for data validation, local-image integrity, search/filter/sort behavior, and required static assets.

Product images and LEGO trademarks belong to their respective owners. This is an independent family collection, not an official LEGO site. External fonts are optional; the layout uses system fallbacks if Google Fonts is unavailable.
