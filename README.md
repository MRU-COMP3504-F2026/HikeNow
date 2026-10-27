# Communication Channel
[Discord Server](https://discord.gg/RmHTHj5gZ9) 

# Shared Google Folder
[Google Drive](https://drive.google.com/drive/folders/1Eg1H2vX3lAmY02DvXf1szu-1euWe6Js_?usp=sharing)

# Product Backlog
[Github Projects](https://github.com/orgs/MRU-COMP3504-F2026/projects/4/views/1)

# Project Members
- Osval Montesinos Valladares
- Tadhg Dunlop
- Jeremy Pacla
- Jaime García Menéndez
- Haniya Shareef

# CI/CD 



| Platform | Pros for HikeNow | Cons for HikeNow |
|---|---|---|
| **GitHub Actions** | A natural fit if the repository is hosted on GitHub. It can run `npm ci`, `npm run lint`, and `npm run build`, and integrate with Vercel deployment and preview checks. | Workflow files and deployment configuration need maintenance. Secrets and environment-specific deployments require careful setup; it is less useful if the repository is hosted elsewhere. |
| **GitLab CI/CD** | Repository, CI, environments, and deployment controls are integrated when using GitLab. Pipelines can run the same npm checks and manage protected deployment environments. | Less compelling if the project is hosted on GitHub. Pipeline configuration and runner setup add overhead for a starter app with only lint and build checks. |
| **Azure Pipelines** | A strong fit for teams already using Azure DevOps or needing enterprise permissions, approvals, and deployment governance. It can build the Node.js app and deploy to Azure services. | Adds setup if there is no existing Azure DevOps environment. Since the app README recommends Vercel, Azure Pipelines may be a less direct deployment fit unless Azure is a requirement. |

**Recommendation:** If the repository is on GitHub and Vercel is the intended host, start with GitHub Actions for CI checks and Vercel for hosting and deployments. Store `DATABASE_URL` and Supabase credentials in encrypted platform environment secrets. Keep Drizzle migrations as a separate, controlled deployment step rather than running them on every build.

The repository now includes [`.github/workflows/ci.yml`](./.github/workflows/ci.yml), which runs `npm ci`, linting, baseline unit tests, and the production build for pull requests and pushes to `main`. The application test commands are `npm test` for a single run and `npm run test:watch` during development. Vercel remains responsible for deployment after CI passes.