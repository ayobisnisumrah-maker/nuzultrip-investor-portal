# Production Content Integrity

## Policy

Investor-facing business content must come from the Admin-managed Supabase data model. The application must never invent financial figures, ownership percentages, distribution amounts, investor balances, company metrics, document metadata, or other business facts.

## Rendering rules

- Published records are rendered from Supabase.
- Draft, review, and archived records are not presented as published investor content.
- Empty production datasets use explicit empty states rather than fabricated values.
- Loading and error states are explicit and do not fall back to fake content.
- Financial and ownership values are formatted only after receiving real database values.
- Documents are shown only when the authenticated investor has access according to database policy.
- Company profile and portal sections are controlled through the Admin publication lifecycle.

## Required Admin-controlled domains

- Company Profile
- Portal Pages and Sections
- Data Room Documents and Versions
- Financial Periods, Reports, KPIs and Line Items
- Ownership Offerings and Holdings
- Profit Distributions, Allocations and Payment Proofs
- Investor Messaging and Notifications

## Prohibited

Do not add hardcoded sample investors, financial numbers, distribution amounts, ownership percentages, document records, fake KPIs, lorem ipsum, or demo company statistics to production UI.

If production data is absent, preserve the layout and display an accurate empty state until an authorized Admin publishes real content.
