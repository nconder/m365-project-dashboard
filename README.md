# CPSync project dashboard

A private, Microsoft 365 project-intelligence workspace. Microsoft Copilot agents collect the information under the user's work identity. OneDrive stores the files. Node serves the dashboard on the desktop.

V1 is intentionally single-project: **CPSync**. No Microsoft API tokens, application-only permissions, external AI providers, analytics services, CDN assets, database, or npm dependencies are used by the application.

## Run on the desktop

Install a supported Node LTS release (22.14 or newer). From this folder:

```powershell
npm start
```

Open `http://127.0.0.1:4317`. The first run displays a genuine empty state, not company-looking sample data.

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

The collector is **not** an API collector inside Node. Install `collector/skills/cpsync-dashboard/SKILL.md` in the work OneDrive at `Documents/Cowork/skills/cpsync-dashboard/SKILL.md` as shown in Microsoft's current Cowork instructions. Start a new Cowork session after installing a skill. The Copilot experience and custom skills must be enabled by the organisation.

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
- Last valid in-process collection retained through malformed/partial sync, identity mismatch and older snapshots.
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
