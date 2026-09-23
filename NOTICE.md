# Attribution and source provenance

Scout Browser is derived from [FreeTube](https://github.com/FreeTubeApp/FreeTube), licensed under AGPL-3.0-or-later. Preserve the included LICENSE, upstream notices, and attribution when redistributing this work. FreeTube and its contributors built the underlying video client, playback and source integrations, and substantial portions of the interface.

Cassandra Melax's Scout work adds parental-guidance settings, AI-assisted search suggestions and content review, and integration of those checks into discovery and playback. Do not attribute the full inherited application to Scout's author or imply that upstream endorses these additions.

This public-preparation source snapshot derives from `c4554ndr4/nextgen_browser_app` at `48808148333103971bb29ceb4db297a3b49658e5`, with documentation, credential/configuration cleanup, removal of private release automation, and review-failure handling changes made in September 2026. A new export date is not the original implementation date.

Keep corresponding source available when distributing modified builds, and retain notices for bundled dependencies and assets. The original AGPL license is included without alteration. This package contains source, not a signed binary release.

## Bundled Roboto font

`src/renderer/assets/font/Roboto-Regular.ttf` is Roboto version 2.137 (2017). Its embedded metadata identifies Google as the designer and states: Copyright 2011 Google Inc. All Rights Reserved. Licensed under the Apache License, Version 2.0. The font is distributed under that license; see the accompanying `src/renderer/assets/font/LICENSE-Roboto.txt`. This asset's license is separate from the application's AGPL license.
