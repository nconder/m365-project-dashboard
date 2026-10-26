# Set up CPSync in either agent builder

Yes: in these two builders, create an agent first and then add its skill. Choose one route for your first collection. You do not need two agents collecting into the same file.

The existing collector was originally documented for Cowork. This guide covers Microsoft 365 Copilot Agent Builder and Copilot Studio. Work IQ supplies work context and tools; the skill supplies the CPSync collection procedure. [Microsoft explains the difference between skills, tools, and knowledge](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/skills-overview).

Reviewed against Microsoft documentation on October 26, 2026. Tenant availability and policy can change which controls you see. Neither route has been installed or verified in the correct CPSync tenant yet.

## Files and settings for both routes

| Setting | Value |
| --- | --- |
| Agent name | CPSync Project Collector |
| Description | Collects cited CPSync meeting and OneDrive document information for my private project dashboard. |
| General Instructions field | Paste [collector/agent-instructions.txt](../collector/agent-instructions.txt) |
| Skill name after upload | cpsync-dashboard |
| Agent Builder upload | [collector/packages/cpsync-dashboard.zip](../collector/packages/cpsync-dashboard.zip) |
| Copilot Studio upload | [collector/skills/cpsync-dashboard/SKILL.md](../collector/skills/cpsync-dashboard/SKILL.md) |
| First collection prompt | [collector/run-prompt.txt](../collector/run-prompt.txt), replacing `{{WORK_ACCOUNT}}` with your verified work email, or copy it from the dashboard after Collection setup |
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

**File-write check:** Adding knowledge or a skill does not establish direct write access to OneDrive. The collector must verify an approved file-create/update tool before reporting a saved snapshot. If this route only produces a downloadable file or a briefing response, collection is not automatic. A reviewed manual save is a separate step. For the automatic file workflow, evaluate route B's approved tools rather than adding broad API grants.

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
6. Open **Preview** and run the first collection prompt. Confirm that actual work search and OneDrive file create/update operations are available and allowed. Review the write result and saved file. If either capability is blocked, record that limitation before continuing.
7. After a successful manual test, publish only to the intended private/internal audience permitted by your tenant. Retest as the intended signed-in user, since a maker's successful Preview does not prove runtime end-user authentication.

The snapshot's `collector.kind` must be `copilot-studio` for this route. The **GitHub Copilot harness** is a Studio runtime name; it does not mean your corporate collection runs from this GitHub repository. [Microsoft describes the runtime boundary](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/overview).

**Discovery with Work IQ:** The Work IQ Sources dialog selects whole workloads and has no individual-folder selector. Enable OneDrive and instruct the agent to find relevant CPSync documents across all locations the current work user can access, including accessible shared OneDrive content where supported. A folder link is optional. Test documents from different locations and verify the cited originals. Whole-workload selection does not prove every item is searchable or every shared drive can be enumerated; report actual tool, indexing, and permission limits. [Microsoft documents whole-workload scoping](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/add-work-iq#select-workloads-for-your-agent).

## Verify the first collection and desktop connection

1. In that work OneDrive, create `ProjectDashboard/CPSync/supporting/` if needed. Sync it through the Windows OneDrive client using the same work account, and mark the CPSync folder **Always keep on this device**.
2. Open the desktop dashboard's **Collection setup**. Enter the existing local CPSync folder and matching work email. The dashboard's copied prompt then includes the configured email.
3. Run the collection manually in the chosen agent. Confirm it loaded the skill, used the intended account, and wrote the actual `snapshot.json` into the correct OneDrive folder. The JSON must contain real identity, host, timestamps, and cited evidence; placeholders must be replaced.
4. Open several citations and verify they support the findings. Missing transcript or document access must appear as partial/unavailable coverage, not invented data.
5. After OneDrive sync, confirm the dashboard accepts the snapshot and produces `dashboard.html` and `presentation-brief.md`. Its 15-second file refresh does not launch an agent. A rejected snapshot must leave the previous valid collection intact.
6. If presentation files are requested, confirm the selected host actually provides approved Office creation tools and saves their outputs into `supporting/`.

The reported account in JSON is an application check, not proof of Microsoft sign-in. The real boundary is the Microsoft session, runtime tool authentication, and work OneDrive permissions. Project filtering in instructions is not a new permission boundary.

## Recurrence and missing capabilities

First verify the manual run. A skill upload does not create a schedule. Configure recurrence only when requested and approved in the selected Microsoft host, using the same work identity and output contract.

Microsoft's [end-user-only credential enforcement](https://learn.microsoft.com/en-us/microsoft-copilot-studio/configure-no-maker-authentication#scope-of-enforcement-and-experience) requires an active user and prevents autonomous/background runs without that authentication. If it applies, keep collection interactive. Do not work around it with maker credentials, a service account, app-only access, or stored tokens.

If a builder lacks skill import, work-data search, or OneDrive file writing, report the missing capability. Installing the files, passing local Node tests, or seeing a generated attachment does not establish successful live collection. No tenant agents, permissions, schedules, or corporate data are created by downloading these setup files.
