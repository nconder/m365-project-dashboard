# Azure v2 migration

V1 runs on the user's desktop. Its OneDrive adapter reads a local synced folder. Moving the server to Azure requires a different authorised file-access path; an Azure app cannot use the desktop's sync directory.

Keep these pieces unchanged:

- `app/snapshot.mjs`: evidence-linked CPSync data contract and validation.
- `app/report.mjs`: portable HTML and presentation-brief rendering.
- The dashboard views and Microsoft Copilot collector instructions.

Replace the local adapter with a delegated OneDrive implementation behind the same operations: read a snapshot, enumerate/read supporting files, and write generated reports/history. Use only the signed-in user's approved delegated scopes. Follow Microsoft-supported authentication; no credentials in URLs, browser code, exports or source control.

Before external hosting:

1. Configure a single-tenant Microsoft Entra app registration and approved App Service sign-in. Application identity used for sign-in is separate from app-only permission to corporate data; the latter is prohibited here.
2. Establish authorised access to OneDrive under each signed-in user. Sign-in alone does not grant Graph permissions. If delegated scopes cannot be approved, retain the desktop version or use an explicitly approved report-publishing process.
3. Partition caches and generated reports by user; never serve one user's personal project snapshot to all authenticated employees.
4. Verify Conditional Access/MFA behaviour, source permissions, logout and token expiry. Use supported secure server-side token/session handling and no long-lived copied user tokens.
5. Bind to the App Service `PORT` and network interface only after authentication and storage integration are tested. V1 deliberately refuses external bindings and Azure startup until this work is complete.
6. Test the complete signed-in collection/read/report cycle, revocation and partial-source failure paths. Update this document and deployment instructions to match the implemented behaviour.

No Azure resources or application registrations are created by v1. The user approved portability to Azure for v2, not an immediate deployment.
