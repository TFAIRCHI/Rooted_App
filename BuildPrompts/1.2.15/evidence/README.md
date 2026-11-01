# Implementation review and evidence

**Real production-image preview:** http://127.0.0.1:3081/

[Execution report](execution.md) records what changed, actual checks, scope, source identity, image ID, and release limitations. [Production release handoff](../../../deploy/azure/homepage-navigation-release-20261030.md) contains the exact next steps.

| Artifact | Purpose |
|---|---|
| [Production-image screenshots](production-screenshots/) | Six implemented topics at desktop/mobile sizes |
| [Application layout screenshots](screenshots/) | Desktop, phone, and 320px captures from the isolated application stack |
| [Browser summary](browser-validation-summary.json) | Latest actual result for all nine journeys and source reports |
| [Layout matrix](layout-validation.json) | All 54 page/viewport measurements |
| [Candidate release checks](production-candidate-validation.json) | 72 passing checks against the built container |
| [Discovery output](production-discovery.txt) | Actual production-mode robots/sitemap output |
| [Image inspection](image-inspect.json) | Actual local artifact identity/platform/labels |
| [Source manifest](release-source-manifest.json) | Hashes of 121 captured build inputs |
| [Changed files](changed-files.json) | Files added/modified for this implementation |
| [Build log](docker-build.log) | Production build and standalone packaging |
| [Unit log](frontend-unit.log) | Final 52 passing frontend tests |

Other screenshots in this folder cover the unchanged account/sample journeys. Earlier failed browser/release-check reports are retained for an honest execution history; the summary and final candidate report identify the accepted local results.
