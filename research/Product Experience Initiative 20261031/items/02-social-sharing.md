# 2. Branded public decks — created from the unified workspace

**Reassessed decision:** keep a separately approved public rendition, but create it through **Share** using the same document/design components as Compose. Do not add a second Studio editor or require reimporting sources. Church branding leads; Rooted remains a consistent secondary credit.

## Creator and member paths

A permitted contributor/admin selects a reviewed Scripture excerpt, study quote, image/diagram or verified-data chart from an approved study snapshot → chooses a reusable layout → checks exact crop/text/caption/link/brand → submits the public rendition → an authorized reviewer approves → members can preview and voluntarily download/share selected cards.

A changes-requested current draft is not an approved source. Show a prior approved revision explicitly if one is used. Editing the live draft does not silently change approved deck bytes. Flexible design means the rendition hash includes layout, crop, asset versions, text/alternatives, template/brand and destination—not just prose.

Members continue to read normally. **Preview → choose cards → download/share** is optional. Cancel restores reading and focus. Explain that exported public copies can be reshared and cannot be recalled; withdrawal stops future Rooted delivery, not existing copies. Exclude names, reactions, prayer requests, private source files and staff discussion.

| Content | Required support |
|---|---|
| Scripture | Exact reviewed text/reference/translation and permitted public use |
| Quote/adaptation | Source context and separately reviewed wording where changed |
| Image/diagram | Rights/provenance and useful accessible description |
| Chart | Real source values, units/labels and data alternative; AI cannot invent evidence |
| Multiple cards | Explicit ordered set and arbitrary member subset, individual fallback downloads |

## Architecture and scope

Approved StudySnapshot → DeckRevision → deterministic renderer → exact public approval → PublicRendition. A private full study can have a public excerpt without exposing its reader; destination clearly says whether sign-in is required. Source-library access never becomes public merely because its material informed a deck.

Use PNG/copyable caption/link as the baseline. The [Web Share specification](https://www.w3.org/TR/web-share/) makes native sharing dependent on support and user activation. Real target apps may treat files, order and text differently; a share-sheet result is not proof of a posted social message. Direct platform posting needs separate account permissions and is deferred.

Deterministic text overlays avoid generated misspellings. Flexible templates require clipping/contrast/long-text/RTL tests and brand locks where needed. Translation permissions depend on actual use; [Crossway](https://www.crossway.org/permissions/) and [Biblica](https://www.biblica.com/permissions/) are reference policies, not licenses granted here.

## Evidence and gates

Local square exports are regenerated; historical portrait exports remain bounded raster evidence after revalidation. Neither proves a persistent deck service or native social-app delivery. Review [current screens and exports](../mockups/README.md) and [validation](../VALIDATION.md).

Before release: persisted exact rendition approval, tenant/member/draft access control, stale/withdraw policy, no private fields in pixels/caption/link, crop/font/long-text tests, actual iOS/Android intended apps, arbitrary subset/cancel/fallback, and an independent recipient check. Reuse Compose's layout/asset foundation; do not make full visual generation a prerequisite for useful quote decks.
