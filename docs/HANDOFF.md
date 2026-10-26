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

Dependency-free Node server, local file adapter, cited snapshot validation, generated HTML/Markdown reports, source dialogs, all dashboard views, presentation mode, supporting-file downloads, a Microsoft Copilot collector skill and a run prompt. The shared skill now documents Agent Builder, Copilot Studio, and Cowork host metadata and capability checks. [agent-setup.md](agent-setup.md) provides both agent-builder setup paths; `collector/agent-instructions.txt` supplies the agent-level Instructions, and `collector/packages/cpsync-dashboard.zip` is the Agent Builder skill upload. Fictional sample mode is explicit. No actual company data is in source control.

## Outstanding device/account verification

- Initial setup files were prepared in the connected work OneDrive. The user then clarified that CPSync belongs to a different work account. The created CPSync project folder and collector-skill folder were removed and their parent folders read back empty. No genuine corporate information was collected. Do not use the initially connected Microsoft account for CPSync. Install the supplied setup files only in the correct work OneDrive after the account is identified.
- Seven isolated Node tests pass, including HTTP ingestion, report exports, bad source/account rejection, and recovery after restarting during a partial sync. Browser checks have exercised the fictional meetings, source dialog, decisions/actions, documents, search, and presentation flow; keep sample evidence clearly labelled.
- The initially signed-in Microsoft Copilot session reports M365 Copilot (Basic), with web data, uploads and viewed content. The user confirmed it is not the CPSync work account. The correct account and its approved work-data/Cowork capabilities still need to be established before collection. Do not acquire additional permissions or substitute a different identity.

- At initial inspection the desktop had no existing synced OneDrive folder. The app must show this honestly until the user signs in to/syncs the correct CPSync work OneDrive and configures the local project folder and expected account.
- No genuine CPSync snapshot has yet been collected by a Microsoft Copilot agent. Agent Builder and Copilot Studio setup instructions have been checked against Microsoft documentation, but no agent was created in the correct tenant. Live Teams/document retrieval, actual runtime end-user authentication, OneDrive file-write capability, source coverage and any recurring task must be verified with the user in the Microsoft environment. A skill import alone does not provide these capabilities.
- A cloud coding environment can finish code and isolated tests without the desktop. It cannot use this desktop's local OneDrive, processes, browser sessions, or work sign-in while the desktop is off.
- Do not mark corporate collection as complete because sample HTTP tests or a browser demo passes.

## Continue

Read AGENTS.md and README.md. Run checks/tests, inspect the actual UI, address defects, and commit/push source-only changes. Maintain the existing requirements. Keep runtime and credential material outside the repository. Complete Windows/OneDrive/Copilot verification when the device and account are available.
