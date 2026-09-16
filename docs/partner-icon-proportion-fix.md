# Partner icon proportion fix

The public partner/logo wall uses a fixed visual box for each published CMS asset so Agen Nuzultrip, Mitra Travel, Mitra Layanan, Land Arrangement, and Mitra Strategis render at consistent proportions.

- Desktop: four equal columns, 180 × 64 px image box.
- Tablet: two equal columns.
- Mobile: one column at <= 560 px.
- `object-fit: contain` preserves each source asset's intrinsic aspect ratio.
- Previous per-image scaling transform was removed to prevent inconsistent optical sizing and clipping.
