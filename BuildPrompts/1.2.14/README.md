# Rooted 1.2.14 — Path B Azure deployment

User requested step-by-step implementation of the existing Path B research. This is a new deployment build request; previous instruction snapshots remain preserved.

Confirmed scope: existing `rooted_study_app` resource group, active Azure subscription 1, main application origin `https://rooted-together.com`, and user-created $95 monthly budget with 50/80/100% alerts.

Deployment progress and technical instructions live in [the Path B runbook](../../deploy/azure/README.md). Initial work adds Linux container packaging, configurable API binding and conditional Next.js standalone output. Credentials stay out of image build inputs. API and worker share an image with separate commands; migrations remain separate and privileged.

Local validation does not establish production deployment acceptance. Azure resources, identity/MFA compatibility, database role/RLS compatibility, selected production data, domain binding, full application verification and cloud restore checks remain outstanding. No demo seeds are part of deployment.
