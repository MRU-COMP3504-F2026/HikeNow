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

The repository now includes [`.github/workflows/ci.yml`](./.github/workflows/ci.yml), which runs `npm ci`, linting, baseline unit tests, and the production build for pull requests and pushes to every branch. The application test commands are `npm test` for a single run and `npm run test:watch` during development. Vercel remains responsible for deployment after CI passes.

## CI trigger events

1. **Push to any branch** — validate every commit that is synchronized to GitHub.
2. **Pull request opened** — validate a new proposed change before review.
3. **Pull request synchronized** — rerun validation after new commits are pushed to the PR.
4. **Pull request reopened** — rerun validation when previously closed work is reopened.
5. **Pull request marked ready for review** — validate a draft before it becomes reviewable.
6. **Pull request converted to draft** — retain a fresh validation result while work continues.
7. **Merge queue group created** — validate the temporary merge-group commit when merge queues are enabled.
8. **Manual workflow dispatch** — allow a maintainer to rerun CI from the Actions tab.
9. **Scheduled weekly run** — detect dependency, runner, or base-image changes even when the repository is inactive.
10. **Release published** — validate the exact source associated with a versioned release before deployment.
11. **Reusable workflow call** — allow another repository workflow to invoke the same validation job.

## Automated test rules

The following rules define what CI must enforce for the current application:

1. **Use the application directory** — commands run from `hike-now`, where the Next.js `package.json` and lockfile are located.
2. **Use a reproducible install** — CI must run `npm ci`, not `npm install`, and must fail if `package-lock.json` is out of sync.
3. **Use the declared Node.js version** — CI uses Node.js 22 consistently across workflow runs.
4. **Run ESLint** — `npm run lint` must complete without errors before a change can merge.
5. **Run all Vitest tests** — `npm test` must pass for the layout, navbar, and footer baseline tests.
6. **Clean up test state** — test setup must clean the JSDOM document between tests so one component test cannot affect another.
7. **Test navigation links** — navbar and footer tests must verify the shared Trails, Reviews, and Chats routes.
8. **Test navigation state** — navbar tests must verify active-route styling and mobile menu open/close behavior.
9. **Test authentication presentation** — navbar tests must verify both the signed-out Login action and signed-in user email state.
10. **Test layout metadata** — layout tests must verify the `Hike Now` title, description, and English document language.
11. **Build the production application** — `npm run build` must complete after linting and unit tests.
12. **Do not commit environment secrets** — Supabase, database, and deployment values must be supplied through GitHub/Vercel secrets; `.env*` files remain ignored.
13. **Require passing CI for protected branches** — the `validate` job should be required before merging into protected branches.
14. **Keep deployment separate from validation** — Vercel handles deployment only after the GitHub checks pass; database migrations are not run automatically by this test workflow.
