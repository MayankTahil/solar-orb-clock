# Deploying the static simulator

Target GitHub repository: https://github.com/MayankTahil/solar-orb-clock
Target Pages URL (only after deployment): https://mayanktahil.github.io/solar-orb-clock/

## GitHub web UI
1. In the repository, choose **Add file -> Upload files**.
2. Upload `app/index.html` from this ZIP to the repository **root** as `index.html` (not inside `app/`). Commit to `main`.
3. Repository **Settings -> Pages -> Build and deployment -> Deploy from a branch**; select `main` and `/ (root)`; save.
4. Wait for deployment and open the URL. Verify the controls work and the version matches.

## Git CLI (if authorized locally)
Clone repository, copy `app/index.html` to its root `index.html`, then `git add index.html && git commit -m "Publish Phase 1 simulator" && git push origin main`.

## Caution
At packaging time, the GitHub connector was authenticated for reading but `create_file` failed HTTP 403. No GitHub Pages deployment has been verified. Do not assume automated commits are working.
