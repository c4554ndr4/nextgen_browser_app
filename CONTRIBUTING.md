# Contributing

Start with a concrete browsing path: what the viewer does, what guidance applies, which evidence is available, and what the interface does if analysis fails. Keep the architecture diagram consistent with the behavior actually implemented.

Use fictional queries, captions, and mocked provider responses in tests. Do not add developer API keys, signing credentials, real viewing histories, or transcripts to the repository. Run `npm test` and `npm run build` for changes to review behavior; include manual verification for changes to navigation and playback. Preserve FreeTube attribution and the AGPL license.

Useful next contributions include one review boundary shared by all routes, cancellation when navigation changes, a main-process provider bridge, and consistent handling of incomplete evidence in the interface.
