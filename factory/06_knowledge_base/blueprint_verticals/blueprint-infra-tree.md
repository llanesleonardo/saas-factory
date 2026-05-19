# Infra decision tree (storage topology) — NAS / cloud / mixed

This documents the infra/environment tree implemented in `factory/blueprint-infra-tree.ts`.

Purpose:
- Capture **where storage lives** (local disk vs NAS vs cloud vs mixed) once
- Then let **DB** and **file/media storage** consume those constraints

Legend:
- `◆` decision (single-select)
- `→` implies / derives

---

## Tree (v1)

◆ **Infra · Storage topology**  
`Local disk` | `NAS mounted volume (NFS/SMB)` | `Cloud object storage first` | `Managed block storage` | `Mixed`

If `NAS mounted` (or `Mixed` in advanced):

◆ **Infra · NAS protocol**  
`NFS` | `SMB`

◆ **Infra · NAS mount path**  
Example: `/mnt/nas` or `/Volumes/share`

---

## How other trees should use this

- **DB tree**: if engine is SQLite (file-based), ask where the file lives: local disk vs NAS.
- **Files/media**: if cloud object storage first, hide `local-filesystem` uploads.
- **Mixed**: allow both (e.g. Postgres managed + S3 uploads + NAS for internal artifacts/backups).

