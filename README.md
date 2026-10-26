# CPSync project dashboard

A private, Microsoft 365 project-intelligence workspace. Microsoft Copilot agents collect the information under the user's work identity. OneDrive stores the files. Node serves the dashboard on the desktop.

V1 is intentionally single-project: **CPSync**. No Microsoft API tokens, application-only permissions, external AI providers, analytics services, CDN assets, database, or npm dependencies are used by the application.

## Run on the desktop

Install a supported Node LTS release (22.14 or newer). From this folder:

```powershell
npm start
```

Open `http://127.0.0.1:4317`. The first run displays a genuine empty state, not company-looking sample data.

On Windows you can also double-click `Start Dashboard.cmd`; keep its window open while using the dashboard.

1. Sign in to the **work** OneDrive sync client with the same work account used by Microsoft Copilot.
2. In that OneDrive, create `ProjectDashboard/CPSync/supporting` and mark the CPSync folder **Always keep on this device**.
3. Open **Collection setup** in the dashboard. Enter the existing local CPSync folder and the work-account email. Settings are saved only to the ignored `.local/settings.json` file.
4. Install the collector skill and complete a first Microsoft Copilot collection as described below.

`PROJECT_DATA_DIR` and `EXPECTED_WORK_ACCOUNT` can set the same values through environment variables. `PORT` defaults to 4317. V1 only binds to loopback and refuses unprotected remote/Azure hosting.

To review the interface with unmistakably fictional data:

```powershell
node app/server.mjs --demo
```

Stop the current process before using the same port, or set a different `PORT`. Demo mode never writes files into OneDrive.

## Microsoft Copilot collection

Microsoft Copilot performs collection; Node reads the resulting OneDrive files. For **Microsoft 365 Agent Builder** and **Copilot Studio**, create an agent first and then add the CPSync skill. Follow the [setup instructions for both builders](docs/agent-setup.md).

**Project documents can stay anywhere in work OneDrive that the signed-in user can access**, including accessible shared OneDrive content. The collector identifies CPSync relevance from document content and meeting references, across locations. No source folder is required and originals do not need to move. `ProjectDashboard/CPSync` is only the output location for snapshots, reports, and requested presentation materials. Folder links are optional search hints, never a restriction on discovery. Cross-location discovery still requires the selected Microsoft host to expose approved search tools; selected knowledge attachments alone do not prove that capability.

| Where you build | File to add to the agent | Starting point |
| --- | --- | --- |
| Microsoft 365 Copilot Agent Builder | [cpsync-dashboard.zip](collector/packages/cpsync-dashboard.zip) | New agent > Configure > Skills > Add |
| Copilot Studio, GitHub Copilot harness | [SKILL.md](collector/skills/cpsync-dashboard/SKILL.md) | Create agent > Build > Skills > Upload a skill |

Use [agent-instructions.txt](collector/agent-instructions.txt) for the agent's general Instructions field. The skill supplies the collection procedure and snapshot contract. Adding a skill does not grant source access, supply a file-writing tool, or create a schedule. Verify these capabilities under the active work user before a real collection.

**Cowork remains another option:** place the same skill in your work OneDrive at `Documents/Cowork/skills/cpsync-dashboard/SKILL.md`, then start a new Cowork session, or use Cowork's Customize > Skills > Upload skill option. See [Microsoft's Cowork instructions](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/use-cowork#upload-a-skill). The full OneDrive setup ZIP is a folder installation bundle; use the individual skill package above in Agent Builder.

Use **Collect with Copilot** in the dashboard to copy `collector/run-prompt.txt`, or open that file directly. The prompt requests the current signed-in work identity, a 14-day CPSync search, real source permalinks, and an honest source-coverage report. A pending manual run must not be described as successful or automatically scheduled.

After a reviewed manual run, recurring collection can be configured **inside Microsoft Copilot**, subject to corporate policy and allowed user-context actions. Node polls files every 15 seconds; that polling does not trigger Copilot or grant access to any source.

If using Copilot Studio instead, use end-user authentication. Microsoft's end-user-only credential enforcement can prevent unattended agent runs. Do not switch to maker/service-account credentials to make a scheduled task succeed.

## OneDrive file layout

```text
ProjectDashboard/CPSync/
  snapshot.json                 # Complete Microsoft Copilot collection
  supporting/                   # Office presentation materials created by Copilot
  history/                      # Accepted snapshot versions, written by Node
  dashboard.html                # Standalone evidence-linked HTML report, written by Node
  presentation-brief.md         # Evidence-linked notes, written by Node
```

The collector skill contains the JSON contract. `examples/cpsync.snapshot.json` is a **fictional example only**. Never use its identity, dates, source links or findings as corporate data.

## What works

- Overview, meeting intelligence, decisions, actions, risks and document findings.
- Source-reference dialogs linking to original Microsoft 365 content.
- Presentation mode, standalone HTML and presentation-notes exports.
- Downloads of supporting Office files from the project folder.
- Work-account, project, evidence, URL, date and size checks on incoming snapshots.
- Last valid collection retained through malformed/partial sync, identity mismatch and older snapshots, with accepted-history recovery after a restart.
- Accepted snapshot history and atomic replacement of generated reports.
- Loopback host, same-origin request and path-boundary checks; escaped content and restrictive browser policies.

The account reported inside a JSON file is **metadata, not a cryptographic proof of Microsoft authentication**. The actual authentication boundary is the user's Microsoft Copilot session and work OneDrive sync. Keep the project folder private to the intended user. Generated HTML/notes contain copied findings; access to a source link does not restrict text already present in a downloaded report.

## Checks

```powershell
npm run check
npm test
```

The tests cover evidence validation, wrong project/account rejection, HTML escaping, path restrictions, live HTTP ingestion/exports, sync failures, old snapshot rejection, and local-only hosting. No live Microsoft or GitHub credentials are needed for tests.

## Azure v2 and continuing development

See `docs/azure-v2.md` for the delegated storage/authentication migration and `docs/HANDOFF.md` for the current implementation and remaining verification. The same data contract and report renderer are portable. A desktop OneDrive sync path is not an Azure storage connection.

Corporate snapshots, documents, OneDrive paths, settings and credentials must never be committed. The private repository contains source, collector instructions, and a clearly fictional fixture only.
