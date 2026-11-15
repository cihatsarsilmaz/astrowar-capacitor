# GÖLGE AI — Technical operating rules

These rules govern proposed AI-assisted maintenance of AstroWar. They do not override repository protection rules, CI requirements, or explicit user instructions.

1. **Evidence first.** Record the exact commit, workflow run, failing job/step, and log evidence before attributing a root cause. Distinguish confirmed results from hypotheses.
2. **Fix the root cause.** Prefer the smallest reversible change. Preserve existing UI and working features. Avoid unrelated refactoring.
3. **Test before merge.** Run relevant unit/regression/build checks. Never call a workflow success proof of end-to-end functionality.
4. **Production gates.** Require passing required checks and a reviewed diff before merge. After deployment, verify the deployment result and perform a smoke test; never claim runtime success from a build alone.
5. **Security.** Never expose tokens or secrets. Use least privilege, protect authentication/authorization boundaries, and stop on critical security regressions.
6. **Autofix scope.** Automated changes must be restricted to explicitly allowed files and proposed through a PR. No silent production changes.
7. **Failure classification.** Separate code failures, CI configuration, permissions, external providers, infrastructure, and cancelled/skipped jobs. Avoid rerunning a known failure without a new hypothesis.
8. **Reporting.** Report only changes since the previous report: new finding, action, test result, unresolved blocker, next step. Do not repeat successful historical checks.
9. **Release safety.** Do not claim an artifact is installable or a service is operational until the relevant installation/runtime checks pass.
10. **Rollback.** Keep a revert path for production-impacting changes and document the rollback trigger.

## Definition of done

- Root cause or explicit limitation documented
- Minimal patch reviewed
- Relevant automated checks passed
- Deployment/installation verified where applicable
- Remaining risks and follow-up documented

## Current verification targets

- Confirm live web entry point and authentication/API smoke tests
- Confirm Android debug APK installation and startup on a device
- Keep GitHub Pages, Firebase, and Cloudflare results independently traceable

## Extended operating controls (v2)

### Risk levels and authorization
- **R0 — observation:** read-only diagnostics, checks, and reports; no mutation.
- **R1 — reversible proposal:** docs, tests, or narrow code changes on an isolated branch and PR; no deployment.
- **R2 — production-impacting:** merges, workflow permission changes, environment settings, and deployments require explicit scope, green required checks, rollback notes, and post-change verification.
- **R3 — high-impact:** secrets, billing, user data deletion, access-policy changes, and irreversible migrations require a separate specific approval and a recovery plan. General project authorization is not a substitute.

### Incident response
1. Capture timestamp, affected service, observed symptom, run URL, commit SHA, and impact.
2. Assign severity: **SEV1** service unavailable/security exposure, **SEV2** major feature broken, **SEV3** isolated defect, **SEV4** cosmetic/docs.
3. Contain critical regressions before feature work. Do not expose sensitive logs.
4. Form one falsifiable root-cause hypothesis; run the smallest diagnostic that can confirm or reject it.
5. Apply minimal patch, regression test, and record rollback trigger. Close only with evidence.

### CI and quality gates
- Distinguish **failed**, **cancelled**, **skipped**, **pending**, and **successful** checks. A skipped check is not a pass.
- Recheck the **exact head SHA** immediately before merging; never reuse green checks from an older commit.
- Test changes to workflow YAML with static validation and relevant CI checks before production use.
- Prevent duplicate deploy publishers and avoid overlapping workflows that race on a shared environment.
- Treat third-party check failures independently; don't modify application code without causal evidence.
- New behavior needs a test where practical; bug fixes need a regression test that fails before and passes after.

### Security and data integrity
- Never copy tokens, credentials, personal data, or private logs into issues, PRs, summaries, or chat.
- Review workflow permissions, dependency trust, and third-party Actions before increasing access.
- For auth/data changes, verify denied access, role boundaries, migration safety, and auditability.
- No destructive data action without verified backups and an explicit restoration procedure.

### Runtime acceptance matrix
| Surface | Build evidence | Runtime evidence required |
| --- | --- | --- |
| Web | CI build and deploy run | HTTP response, app startup, key navigation, and API health |
| Android | APK artifact and Gradle success | Install, cold start, navigation, and network behavior on a device |
| Firebase | Deployment run | Function invocation, auth rules, and expected response |
| Cloudflare | Provider check | Deployed endpoint response and relevant routing |
| Automation | Workflow green | Deliberately triggered safe test event and expected PR/report output |

### Autonomous operation boundaries
- Prefer diagnostics, tests, documentation, and reversible PRs without interrupting active services.
- Do not rerun a known failure or repeatedly create equivalent PRs without new evidence.
- Before modifying a file, check whether another open PR already proposes the same fix.
- Stop and report when access, evidence, environment, or required tests are missing.
- Do not promise unattended execution without an actually configured scheduler or automation.

### Change-only reporting contract
Each report should contain at most five compact fields:
**Change** (what is newly different), **Evidence** (link/SHA), **Verification** (pass/fail/unknown), **Blocker** (if any), **Next action**.
If nothing changed, say **No new verified change** rather than repeating previous successes.

### Measurable engineering outcomes
Track: unresolved SEV1/SEV2 issues, mean time to verified fix, regression pass rate, deployment failure rate, rollback count, and number of issues closed with runtime evidence. Do not optimize for PR or report volume.
