# Poki RC final blocker fix plan

User-approved scope: small-screen English Summary text containers, Poki-only static HTML metadata, release checks/docs and RC v2 packaging. Keep the current branch. Do not modify SDK requests or any frozen runtime behavior.

1. Preserve desktop English and Chinese by limiting Summary CSS to English at widths <=900px. Prefer widening the existing evaluation/retention text containers within the existing paper panel over globally shortening copy or reducing fonts; retain all text and overall geometry.
2. Modify the existing Poki-only Vite HTML transform to output English lang/title/description. Keep the standalone HTML source untouched. Extend the build audit to assert both metadata variants and absent game-owned third-party URLs.
3. Add a focused production browser test: complete Day 1, capture the four requested English sizes, measure evaluation/retention text and nearby controls; compare desktop English and Chinese screenshots against the same production scene with only the new CSS rule removed. Capture request initiators; mock only the SDK entry for deterministic game-origin isolation. Do not run or alter the old restrictive real-SDK probe.
4. Run npm test, npm run build, npm run build:poki, npm run test:poki and the focused checks. No expanded campaign audit.
5. Commit the fix, build version poki-rc-v2+sourceSHA, create a separate v2 ZIP/manifest/checksum, mark v1 obsolete and update downstream request status to REQUIRES LIVE INSPECTOR CLASSIFICATION / PENDING LIVE INSPECTOR.
6. Commit release evidence and push; do not merge main or upload to Poki. Final readiness is READY FOR POKI INSPECTOR when the focused checks pass.
