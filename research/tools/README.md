# Research artifact validator

Requires Node 24+ and installed Google Chrome. Override Chrome's executable with `CHROME_PATH` when needed. Dependencies are exact versions queried from the official npm registry; the lockfile also pins transitive packages. This is research tooling only.

From the repository root:

```powershell
npm ci --prefix research/tools --registry=https://registry.npmjs.org
npm run validate --prefix research/tools
```

To render only diagrams while documents and mockups are still being authored, run `npm run validate --prefix research/tools -- --diagrams-only`. This produces `research/tools/diagram-results.json` and does not claim package validation.

To check only links, anchors and source IDs, run `npm run validate --prefix research/tools -- --documents-only`. This produces `research/tools/document-results.json`; missing documents still fail until their owners finish writing them.

Run the separately owned illustrative SQL smoke checks with `npm run validate:schema --prefix research/tools`. PGlite is pinned locally for reproducibility; see `schema-check.mjs` and `schema-validation.json` for its actual scope and results. This does not validate production PostgreSQL operations or authorization.

The validator checks local Markdown links (including heading and explicit HTML anchors), S01-style source references against definitions in `sources.md`, all fourteen manifest PNGs and their signature/IHDR/dimensions, and exactly eight Mermaid sources. Actual Mermaid browser `parse` and `render` calls use the locally packaged ESM module and its local chunks. Browser requests outside the temporary loopback server are blocked. No CDN, downloaded browser, vendor accounts, or production app is used. SVGs are written to `research/diagrams/rendered/` and the complete machine-readable result to `research/tools/validation-results.json`. Any failure produces a nonzero exit status; incomplete artifacts are failures, not skipped passes.

Basic browser audits verify the two exact creation choices, date-first visual ordering and date switching, blank manual creation and reload persistence, viewport overflow, main landmarks, and named controls across the fourteen screens. These are bounded checks, not full accessibility or usability certification. Canonical PNG capture and broader workflow checks are owned by `research/mockups/source/capture.mjs`; rerun that command before this validator when mockups change. The validator does not write into the mockups directory.
