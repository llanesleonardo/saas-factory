# Scaffold station — audit records only

Each **`scaffold-run.json`** here is a **copy** of the same document written to:

- **`configs/apps/<slug>/scaffold-run.json`**
- **`apps/<slug>-instance/scaffold-run.json`**

Layout under this folder:

- **`records/<order-id>/<slug>/scaffold-run.json`** when **`mfg app scaffold`** is run with **`--order-id <order-id>`** (the order segment is sanitized for use as a single path component).
- **`records/_unscoped/<slug>/scaffold-run.json`** when no **`--order-id`** is passed (local or exploratory scaffolds).

After **`npm run mfg -- app scaffold -- <slug> …`**, use these files to answer “what did scaffold actually do?” without opening **`apps/`**.

Generated application code lives **only** under **`apps/`** at repo root.
