# Deploying the static simulator

Target GitHub repository: https://github.com/MayankTahil/solar-orb-clock
Live Pages URL (verified): https://mayanktahil.github.io/solar-orb-clock/

## How it works now
The simulator lives in the repository root as `index.html` — the **single source of truth** (there is no copy under `app/`). GitHub Pages builds from `main` / `/ (root)`, so a plain `git push origin main` deploys within a minute or two. After pushing, verify the live URL reflects the change before calling it deployed.

## Git CLI
Edit `index.html`, then `git add index.html && git commit -m "..." && git push origin main`.

## Historical note
Early deployment attempts through the ChatGPT GitHub connector failed with HTTP 403 and no deployment was verified at that time. Deploys now go through the `gh` CLI and have been verified.
