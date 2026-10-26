# Set up CPSync in either agent builder

Yes: in these two builders, create an agent first and then add its skill. Choose one route for your first collection. You do not need two agents collecting into the same file.

The existing collector was originally documented for Cowork. This guide covers Microsoft 365 Copilot Agent Builder and Copilot Studio. Work IQ supplies work context and tools; the skill supplies the CPSync collection procedure. [Microsoft explains the difference between skills, tools, and knowledge](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/skills-overview).

Reviewed against Microsoft documentation on October 26, 2026. Tenant availability and policy can change which controls you see. Neither route has been installed or verified in the correct CPSync tenant yet.

## Existing M365 agent: get a snapshot now

The current dashboard is a manual export/import workflow, with no direct agent connection. Work-data search is enough to start. An unavailable OneDrive write tool or identity API must not block evidence collection.

If you already installed the current CPSync skill, copy the [short example snapshot prompt](example-snapshot-prompt.txt) into the agent's chat. It contains no email address; confirm your report account inside your work agent. The full request below also works without an installed skill.

1. Download [the self-contained snapshot request](../collector/snapshot-request.txt), or select **Get snapshot request** in the local dashboard and copy its full text.
2. Send that request to your existing work agent. It includes the full format, so a skill install is optional. Confirm your work email inside that agent as the report's label; an independent identity endpoint is not required.
3. Have it return a downloadable `snapshot.json`, or the complete JSON in one code block if file generation is unavailable. It must report its actual delivery and never describe a download as a OneDrive save.
4. Select **Load snapshot** in the dashboard. Choose the file or paste the JSON and confirm the report account. Keep corporate results on an authorised device; do not send them to this development chat or GitHub.
5. With an output folder configured, the app saves the validated snapshot and generates reports there. Without one, it opens a session preview that disappears when the server restarts. An invalid snapshot leaves the previous valid briefing intact.

**Source-link warnings:** A missing or unrecognised citation URL no longer blocks import. The app retains the findings and source title/ID, removes the unusable address, and shows **Link needs review**. Unsafe or unrecognised links are not clickable, and affected complete coverage becomes partial. You do not need to enable HTTPS on the local dashboard. Do not fabricate or rewrite source URLs merely to satisfy validation.

If you imported an earlier skill or pasted earlier agent instructions, replace them with the current versions. Those older instructions incorrectly required OneDrive writing before searching. For a single export, the new request explicitly allows manual export without that tool. The builder setup below is optional when you already have a working agent.

## Files and settings for both routes

| Setting | Value |
| --- | --- |
| Agent name | CPSync Project Collector |
| Description | Collects cited CPSync meeting and OneDrive document information for my private project dashboard. |
| General Instructions field | Paste [collector/agent-instructions.txt](../collector/agent-instructions.txt) |
| Skill name after upload | cpsync-dashboard |
| Agent Builder upload | [collector/packages/cpsync-dashboard.zip](../collector/packages/cpsync-dashboard.zip) |
| Copilot Studio upload | [collector/skills/cpsync-dashboard/SKILL.md](../collector/skills/cpsync-dashboard/SKILL.md) |
| First collection prompt | [collector/snapshot-request.txt](../collector/snapshot-request.txt), replacing `{{WORK_ACCOUNT}}` with your confirmed work email, or copy the full request from the dashboard |
| OneDrive output | `ProjectDashboard/CPSync/snapshot.json` |
| Office supporting files | `ProjectDashboard/CPSync/supporting/` |

Download the actual upload file from GitHub using **Download raw file**. Do not save the GitHub webpage as the skill. The skill ZIP contains `SKILL.md` at its root; the larger OneDrive setup bundle has a different purpose.

Use the work account that owns CPSync throughout. Keep work emails, meeting links, source-folder configuration, and collected company data in your private work OneDrive copy, outside this Git repository.

**Documents can live anywhere in accessible work OneDrive.** No project source folder is required. The agent should find CPSync documents by relevance across locations, including accessible shared OneDrive content, without moving the originals. Use document contents and verified meeting/document links to establish project relevance; a CPSync filename or folder name is not required. Folder links are optional discovery hints, not limits. `ProjectDashboard/CPSync` is only the output folder for snapshots, reports, and requested presentation materials. Generated files and setup instructions are not independent primary evidence about the project.

## A. Microsoft 365 Copilot Agent Builder

1. Open [Microsoft 365 Copilot](https://m365.cloud.microsoft) under your CPSync work account. Under **Agents**, select **New agent / Create an agent**.
2. Open **Configure**, or select **Skip** if the conversational builder offers it. Enter the shared name, description, and Instructions above.
3. Expand **Skills > Add**. Upload **cpsync-dashboard.zip** and confirm the skill is named `cpsync-dashboard`.
4. Check the available Microsoft 365 knowledge and search capabilities. A selected file or folder can provide useful context, but it must not become the boundary for project discovery. No source-folder link is required. Verify whether this agent can search relevant work OneDrive content beyond explicitly selected sources. If it cannot, report the limitation and use route B with approved Work IQ search for this requirement.
5. Keep availability limited to yourself. Select **Create** and use the tenant's permitted publish/install flow to open your agent. Start a new conversation and run the first collection prompt.

Microsoft's [Agent Builder skills walkthrough](https://microsoft.github.io/copilot-camp/pages/extend-m365-copilot/12-skills-da-agent-builder/) requires a ZIP with `SKILL.md` at its root and currently lists Frontier access for this feature. A missing Skills control can therefore require an administrator to check availability.

**Delivery:** OneDrive writing is optional. Continue read-only collection when work search is available, then return a downloadable snapshot or complete JSON for manual import. A direct OneDrive save requires an approved write tool and a successful write result. Neither a download nor manual import is automatic agent collection.

The snapshot's `collector.kind` must be `microsoft-365-copilot` for this route.

### Discover documents across OneDrive

1. Ask the agent to search for CPSync across all work OneDrive locations accessible to your signed-in account. Include relevant shared OneDrive content where the tools support it. Do not constrain it to the dashboard output folder or require all originals to share a folder.
2. Have it confirm matches from the documents' contents and references in CPSync meetings. Documents can have generic names. Optional known document or meeting links can improve discovery without becoming a mandatory file list.
3. Test with known project documents from different locations and check the original citations. Finding those examples does not prove exhaustive coverage. If the available tools only search selected sources or cannot access shared items, the collector must report partial/unavailable coverage.

Microsoft documents [selected OneDrive knowledge sources and their limits in Agent Builder](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-knowledge#sharepoint-and-onedrive-content). Adding that context does not establish automatic discovery of new project documents anywhere in OneDrive. For this requirement, prefer Copilot Studio with the OneDrive workload in Work IQ, after verifying the approved tools actually provide the required search scope. The skill cannot add missing tools or permissions.

For Teams context, use the Knowledge search box's **Chats** or **Meetings** tab to select CPSync items where available. **My Teams chats and meetings** searches more broadly across the signed-in user's accessible content. [Microsoft Teams knowledge options](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-knowledge#microsoft-teams-data).

## B. Copilot Studio with Work IQ

1. Open [Copilot Studio](https://copilotstudio.microsoft.com) with your CPSync work account and select an environment where you can create agents.
2. If shown, enable **New experience**. Create **Agent (GitHub Copilot)**. This selects the Studio runtime that supports uploading this kind of skill. Enter **CPSync Project Collector** and paste the shared Instructions. See Microsoft's [agent creation walkthrough](https://microsoft.github.io/agent-academy/recruit-nextgen/04-build-a-custom-agent/).
3. In **Build > Skills > Add skill > Upload a skill**, upload the individual **SKILL.md** file and confirm its name. Studio also accepts a skill ZIP. [Microsoft upload instructions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/skills-add-existing).
4. Open **Build > Tools > Work IQ**. Review its connection and sign in with your CPSync work account if prompted. Select **OneDrive, Teams, and Calendar**; include **Outlook mail** only if needed for supporting context. Clear **SharePoint** and other unused workloads. Select **Done**. These are whole-service selections, not a restriction to a single project folder. [Microsoft Work IQ configuration](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/add-work-iq).
5. Verify that tool calls use the active end user's identity at runtime. Select **End-user credentials** wherever that control is offered; do not use a maker/service-account connection as a runtime substitute. Microsoft documents an [administrator control for end-user credentials](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-no-maker-authentication); its environment-wide settings should be reviewed by IT rather than changed just for this guide.
6. Open **Preview** and run the full snapshot request. Use approved work search to collect evidence. If OneDrive writing is unavailable, return the JSON file or complete JSON response for manual import. Report unavailable source types honestly; do not require an identity API just to label the report with the user's confirmed work email.
7. After a successful manual test, publish only to the intended private/internal audience permitted by your tenant. Retest as the intended signed-in user, since a maker's successful Preview does not prove runtime end-user authentication.

The snapshot's `collector.kind` must be `copilot-studio` for this route. The **GitHub Copilot harness** is a Studio runtime name; it does not mean your corporate collection runs from this GitHub repository. [Microsoft describes the runtime boundary](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/overview).

**Discovery with Work IQ:** The Work IQ Sources dialog selects whole workloads and has no individual-folder selector. Enable OneDrive and instruct the agent to find relevant CPSync documents across all locations the current work user can access, including accessible shared OneDrive content where supported. A folder link is optional. Test documents from different locations and verify the cited originals. Whole-workload selection does not prove every item is searchable or every shared drive can be enumerated; report actual tool, indexing, and permission limits. [Microsoft documents whole-workload scoping](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/add-work-iq#select-workloads-for-your-agent).

## Verify the first collection and desktop connection

1. In that work OneDrive, create `ProjectDashboard/CPSync/supporting/` if needed. Sync it through the Windows OneDrive client using the same work account, and mark the CPSync folder **Always keep on this device**.
2. Open the desktop dashboard's **Collection setup**. Enter the existing local CPSync folder and matching work email. The dashboard's copied prompt then includes the configured email.
3. Run the full request in the chosen agent under your intended work sign-in. Confirm that it returned complete JSON or a downloadable snapshot, or actually saved it through an approved OneDrive write tool. The JSON must contain the confirmed report email, actual host/timestamps, and cited evidence; placeholders must be replaced.
4. Open several citations and verify they support the findings. Missing transcript or document access must appear as partial/unavailable coverage, not invented data.
5. Use **Load snapshot** to import the returned file or JSON. With an output folder set, confirm it creates `snapshot.json`, `dashboard.html`, and `presentation-brief.md` there. Directly saved OneDrive snapshots can also arrive through sync. The 15-second file refresh does not launch an agent. A rejected import leaves the previous valid briefing intact.
6. If presentation files are requested, confirm the selected host actually provides approved Office creation tools and saves their outputs into `supporting/`.

The reported account in JSON is an application check, not proof of Microsoft sign-in. The real boundary is the Microsoft session, runtime tool authentication, and work OneDrive permissions. Project filtering in instructions is not a new permission boundary.

## Recurrence and missing capabilities

First verify the manual run. A skill upload does not create a schedule. Configure recurrence only when requested and approved in the selected Microsoft host, using the same work identity and output contract.

Microsoft's [end-user-only credential enforcement](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-no-maker-authentication#scope-of-enforcement-and-experience) requires an active user and prevents autonomous/background runs without that authentication. If it applies, keep collection interactive. Do not work around it with maker credentials, a service account, app-only access, or stored tokens.

If a builder lacks skill import, work-data search, or OneDrive file writing, report the missing capability. Installing the files, passing local Node tests, or seeing a generated attachment does not establish successful live collection. No tenant agents, permissions, schedules, or corporate data are created by downloading these setup files.
