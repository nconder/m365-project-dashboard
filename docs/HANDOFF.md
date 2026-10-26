# CPSync implementation handoff

## User requirements

- First project: CPSync.
- Microsoft Office and Microsoft 365 Copilot agents perform all collection under the user's work identity.
- OneDrive stores HTML, structured project information, history and supporting presentation files.
- Node hosts the desktop browser dashboard for v1; Azure App Service is a v2 option.
- No SharePoint dashboard/database; underlying business OneDrive storage is allowed.
- Corporate API access is restricted. Do not add app-only permissions, service accounts or API-key providers. Cost is not the limiting factor.
- GitHub repository must remain private: `nconder/m365-project-dashboard`.

## Current code

Dependency-free Node server, local file adapter, cited snapshot validation, generated HTML/Markdown reports, source dialogs, all dashboard views, presentation mode, supporting-file downloads, a Microsoft Copilot Cowork collector skill and a run prompt. Fictional sample mode is explicit. No actual company data is in source control.

## Outstanding device/account verification

- The connected work OneDrive was discovered through a delegated Microsoft connector. At initial inspection the desktop had no existing synced OneDrive folder. The app must show this honestly until the user signs in to/syncs the work OneDrive and configures the local CPSync folder.
- No genuine CPSync snapshot has yet been collected by a Microsoft Copilot agent. Live Teams/document retrieval, actual work-account reporting, source coverage and a recurring task must be verified with the user in the Microsoft environment.
- A cloud coding environment can finish code and isolated tests without the desktop. It cannot use this desktop's local OneDrive, processes, browser sessions, or work sign-in while the desktop is off.
- Do not mark corporate collection as complete because sample HTTP tests or a browser demo passes.

## Continue

Read AGENTS.md and README.md. Run checks/tests, inspect the actual UI, address defects, and commit/push source-only changes. Maintain the existing requirements. Keep runtime and credential material outside the repository. Complete Windows/OneDrive/Copilot verification when the device and account are available.
