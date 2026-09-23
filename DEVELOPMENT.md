# Developing Scout Browser

This is a source preview for the desktop application. Use Node 22.14 or newer and npm. From this directory:

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm ci` runs the inspected player patch step: it updates local player files and may download the Material Icons font. `npm run build` creates local bundles in `dist`; it does not sign, notarize, or publish an installer. The source preview removes historical signing/release automation and disables automatic binary updates. Standard development startup may need to download the Electron runtime.

## Runtime configuration

Supply configuration in the environment of the terminal that launches the desktop application:

```sh
export SCOUT_GEMINI_API_KEY='your-own-key'
export SCOUT_GEMINI_MODEL='your-chosen-model'
# Optional: only for the separately deployed backend route.
export SCOUT_FILTER_BACKEND_URL='https://your-analysis-service.example'
npm run dev
```

Do not put real keys in a committed file, a build-time substitution, an issue, or a screenshot. The source distribution ships no model choice; select a currently supported model from your provider. This guide does not assert availability of any historical model. The desktop renderer reads the launch environment at runtime. A Finder-launched app does not automatically read the shell environment, and the web preview has no desktop configuration bridge. `.env.example` documents variable names but is not automatically loaded by `npm run dev`.

The optional backend must implement `POST /api/content-analysis/analyze-metadata`, returning `analysis.appropriate` as a boolean and optionally `analysis.recommendation` and `analysis.reasoning`. It also exposes `/health`. Its existing request profile specifies age 11 and fixed policy flags; it does not propagate every local guidance setting. This backend is not included in the desktop source package. Only HTTPS or loopback HTTP URLs without embedded credentials, query parameters, or fragments are accepted.

## Verification and limits

`npm test` runs isolated provider-contract tests with fictional inputs and mocked external services. `npm run build` verifies bundling. Neither proves that current video-provider endpoints work or that the application prevents access to all undesired content. Live model calls, end-to-end playback, signed installers, and operating-system enforcement need separate verification.

Metadata review hides unchecked video candidates when the service is missing, fails, or returns invalid data. Captions and frames report unknown when evidence is missing; this does not stop playback by itself. The featured home and several inherited routes do not share a universal review boundary. A blocking overlay is application behavior, not an operating-system access-control mechanism.

The existing desktop window still enables Node integration and disables context isolation. Runtime configuration keeps credentials out of built bundles but does not isolate them from compromised renderer code. Moving provider calls to a narrow main-process bridge, turning on isolation, and testing navigation/cancellation are important follow-up work before broad deployment. Development logging can contain search text, captions, and review details; do not share real-user logs.

The inherited repository lint rules cover a much larger codebase than the new contract tests. Review existing lint debt separately from build/test results; passing the focused tests does not certify all inherited code.
