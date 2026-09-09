# Portal & Dashboard Activation Checkpoint

Scope verified for this release:

- Public home renderer accepts every supported published CMS section kind.
- Header excludes inactive/dead navigation and the public Artikel entry.
- Public CTA, document links, article links, footer contact action, Instagram, and TikTok are functional when configured.
- Investor information and FAQ surfaces are no longer suppressed by the visual-reference stylesheet.
- Admin Hero, CTA, FAQ, and Portal Documents modules can create a missing section directly from their own module page when the active page is in Draft and the principal has `portal.update`.
- Empty CMS modules remain data-driven; no fake business records are inserted.

Production portal navigation data was also aligned so the Artikel header item is hidden and footer links that previously targeted non-rendered standalone anchors resolve to the Investor Information section.
