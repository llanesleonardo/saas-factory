# Azure pipeline setup — `core-saas` → App Service

This repo deploys **`apps/core-saas`** with **`.github/workflows/azure-deploy-core-saas.yml`** using **OIDC** (no publish profile file in Git).

## 1. Azure: Web App

Create (or reuse) a **Linux** Web App whose runtime matches what you will run (e.g. **Node 22 LTS** when you add a Node server). Note:

- **Resource group** name  
- **Web App** name  

Configure the app in Azure Portal as needed (startup command, env vars, CORS).

## 2. Azure: Entra app + federated credential (for GitHub Actions)

Create an **App registration** (or use an existing automation principal). Configure **Federated credentials** for GitHub Actions (issuer `https://token.actions.githubusercontent.com`) so this repo/environment can obtain tokens.

Grant that identity Azure RBAC on the deployment scope (typical: **Contributor** on the resource group that holds the Web App, or a narrower role if you prefer).

Collect:

| Item | Where it goes |
|------|----------------|
| Application (client) ID | Repo secret **`AZURE_CLIENT_ID`** |
| Directory (tenant) ID | Repo secret **`AZURE_TENANT_ID`** |
| Subscription ID | Repo secret **`AZURE_SUBSCRIPTION_ID`** |

## 3. GitHub: Variables (not secrets)

| Variable | Example meaning |
|----------|-------------------|
| **`AZURE_RESOURCE_GROUP`** | Resource group containing the Web App |
| **`AZURE_WEBAPP_NAME_CORE_SAAS`** | Name of the Linux Web App |

Path: **Settings → Secrets and variables → Actions → Variables**.

## 4. Run the workflow

**Actions → “Azure — core-saas (App Service)” → Run workflow.**

Deployments do **not** run on `pull_request` (manual / dispatch only in this file).

## 5. Optional hardening (later)

- GitHub **Environments** (`production`) with approvals.  
- Separate federated credentials per environment (`subject` / environment name).  
- Application Insights wiring from the Web App blade.

When you add **`package.json`** under **`apps/core-saas`**, the workflow will run **`npm ci`** and **`npm run build`** automatically before zipping.
