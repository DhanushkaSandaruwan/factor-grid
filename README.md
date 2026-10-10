# FactorGrid (HFDIR_REVAMP)

Enterprise human factors issue reporting platform built with Next.js (App Router),
MongoDB (Mongoose), Clerk authentication and Tailwind CSS + shadcn/ui primitives.
See `../PROMPT_RULES.md` for the engineering constitution that governs this codebase.

## Features

### Onboarding

Post-auth profile collection (first/last name, contact number, company name).

- Page: `src/app/onboarding/page.jsx`
- API: `POST /api/onboarding`
- Service: `src/lib/services/user-profile-service.js`

### Projects

New-project wizard reachable from the **New Project** button in the top bar
(left of the signed-in user).

- Dashboard (`/dashboard`) lists the projects the user owns or is a member of
  as summary cards (client, issue ID prefix, description, attribute and
  package counts, created date) with **View** and **Edit** actions, newest
  first. When there are no projects, an empty state invites the user to
  create one.
- View page: `src/app/(app)/projects/[id]/page.jsx` — project header with an
  edit action (owners and editors only), issue metrics and charts, and team
  management.
- Edit page: `src/app/(app)/projects/[id]/edit/page.jsx` — the same wizard as
  creation, prefilled with the project's current values (owners and active
  editors only).
- Wizard page: `src/app/(app)/projects/new/page.jsx` — wizard on the left,
  live project preview with confirmation checkbox and **Create Project**
  action on the right.
- Wizard steps:
  1. **Basics** — project title, client, description, issue ID prefix
     (issues are numbered like `PREFIX-001`).
  2. **Attributes** — multi-select chips for Attributes Type (HF), Attributes
     Type (Risk Assessment) and Action Attributes. Options are loaded from the
     `attribute_options` collection (seeded once with defaults), so admins can
     rename, reorder, add or deactivate options in the database without code
     changes.
  3. **Packages** — create any number of packages (Package ID + description,
     persisted immediately via `POST /api/packages`) and/or select existing
     packages to attach to the project.
- API: `POST /api/projects` (create) and `PUT /api/projects/[id]` (update) —
  both validate basics, attribute selections and package references
  server-side and return the failing wizard step with field errors;
  `GET/POST /api/packages`.
- Services: `src/lib/services/project-service.js`,
  `src/lib/services/package-service.js`,
  `src/lib/services/attribute-option-service.js`.
- Models: `src/models/project.js`, `src/models/package.js`,
  `src/models/attribute-option.js`.

### Project analytics & team

The project view page shows (placeholder analytics until the issue features
exist — deterministic dummy data per project):

- **Metrics** — total/open/closed/transferred issue counts plus issue counts
  per selected attribute (HF, Risk Assessment, Action).
- **Charts** (recharts) — Monthly Issue Breakdown (bar, by status), Issues
  Report (pie, by status) and Issue Trends (cumulative line from the first
  reported issue to the current month).
- Service: `src/lib/services/project-analytics-service.js`.

Team collaboration with role-based access:

- **Team members** card — owner plus invited/active members with role badges
  (owner/editor/viewer). Owners and active editors can invite members
  (email, role, first/last name, contact number, optional personal message);
  emails belonging to registered users auto-populate their details.
- **Invitations** — registered invitees get an in-platform notification (bell
  menu in the top bar) to accept or decline. Accepting activates the
  membership and grants access (editors can update, viewers read-only).
  Invitations for unregistered emails are stored for a future email flow.
- Access model: owners and active editors can edit/invite; active members of
  any role can view; the dashboard lists owned and shared projects.
- API: `GET/POST /api/projects/[id]/members`, `GET /api/invitations`,
  `PATCH /api/invitations/[id]`, `GET /api/users/lookup?email=`.
- Services: `src/lib/services/membership-service.js` (invites, responses,
  access checks), `src/lib/services/project-service.js` (access-aware
  project reads/updates).
- Model: `src/models/project-membership.js`.

### Media storage (Cloudflare R2)

Media files (photos, video, documents) live in a Cloudflare R2 bucket and are
reached through short-lived presigned URLs, so file bytes never pass through
the Next.js server. MongoDB only stores the metadata record that pairs a file
with its R2 object key.

- **Upload (presigned, recommended for anything but tiny files)** —
  `POST /api/storage/files` with `{ filename, contentType, size, projectId?,
label? }` reserves a key and returns a presigned `PUT` URL. The client
  uploads the bytes straight to R2 with that URL, sending the returned
  `Content-Type` header verbatim (R2 stores whatever type the request
  declares, and inline viewing depends on it), then calls
  `POST /api/storage/files/[id]/confirm`, which verifies the object exists and
  activates the record.
- **Upload (direct, small files)** — `POST /api/storage/upload` accepts
  `multipart/form-data` with a `file` field plus optional `projectId` and
  `label`, and stores the file in one request.
- **List** — `GET /api/storage/files` returns the caller's own files plus the
  files of every project they are an active member of; add `?projectId=` to
  scope to one project. Only confirmed files are listed — a file stays
  invisible until its upload is confirmed.
- **View / download** — `GET /api/storage/files/[id]` returns metadata plus a
  fresh presigned view URL. `GET /api/storage/files/[id]/content` redirects to
  the bytes: `?disposition=inline` (default) renders images and video in the
  browser, `?disposition=attachment` downloads with the original file name.
  Both return 404 until the upload is confirmed.
- **Delete** — `DELETE /api/storage/files/[id]` removes the R2 object and the
  metadata record.
- **Access model** — files are either `user` scoped (only the uploader) or
  `project` scoped (any active member may read; the uploader, project owner or
  an active editor may delete).
- **Limits** — content type allow list and a 50 MB default size cap, both
  configurable (see `.env.local.example`).
- Services: `src/lib/services/media-file-service.js` (validation, access
  control, orchestration), `src/lib/services/storage-service.js` (presigned
  URLs, HEAD, upload, delete), `src/lib/r2.js` (client and configuration).
- Model: `src/models/media-file.js`.

Setup: create a bucket and an **Object Read & Write** API token in the
Cloudflare dashboard (**Storage & databases > R2 > Overview > Manage API
Tokens**), then set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
and `R2_BUCKET_NAME` in `.env.local`. Because browser uploads with presigned
URLs are cross-origin requests to R2, add a CORS rule to the bucket allowing
`PUT` (and `GET` if you point media tags at the content endpoint) from your
app origin:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

## Development

```bash
npm run dev     # start dev server
npm run lint    # eslint
npm run check   # lint + production build
```

Requires a `.env.local` with `MONGODB_URI` and Clerk keys (see
`.env.local.example`). Media storage additionally needs the Cloudflare R2
settings listed in `.env.local.example`.
