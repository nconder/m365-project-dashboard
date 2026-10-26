# Project instructions

- Build the smallest complete CPSync v1: local Node dashboard; work OneDrive file storage; Microsoft Office/Copilot agents exclusively for collection.
- All corporate access stays under the signed-in work user. No app-only Graph grants, service accounts, external AI APIs, scraped tokens, or automatic credential workarounds.
- Never put actual company data, tokens, work-account configuration, source documents, or OneDrive paths in Git. Keep runtime state outside the checkout and local settings in ignored `.local/`.
- Keep Node dependency-free unless a concrete requirement justifies a dependency. Use Node LTS 22.14+ and standard browser APIs.
- Default to real empty states. Fictional fixtures must remain explicitly labelled and opt-in (`--demo`). Do not claim live collection or OneDrive sync based on a file fixture.
- Preserve source citations and honest partial/unavailable coverage. Generated reports never provide new source access rights.
- Keep the storage boundary separate from report rendering. Azure v2 requires verified Entra sign-in and approved per-user delegated OneDrive access before remote hosting is enabled.
- Run `npm run check` and `npm test` for nontrivial changes. Inspect actual browser behaviour for UI changes when a browser is available.
- Do not create subagents or external recurring tasks unless the user explicitly asks.
