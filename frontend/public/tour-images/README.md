# Tour Images (baked into build)

These are the **user's own uploaded tour photos**, copied out of `backend/uploads/`
(which is gitignored + lives on an ephemeral cloud disk) into the frontend build so they
are committed to git and served same-origin by the static site at `/tour-images/<file>`.
This makes them survive server restarts on the free hosting tier.

- Files here are referenced by tour rows in the DB after the image-URL rewrite
  (`http://localhost:3000/uploads//X` → `/tour-images/X`). See `DEPLOY_SHOWCASE_PLAN.md`, Sprint 3.
- Do NOT rename these files — the DB image URLs must match the filenames exactly.
- Only the 19 files used by the 12 kept/active tours are here. Unsplash-linked tours are disabled.
