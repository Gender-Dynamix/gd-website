// src/tests/__mocks__/astro-schema.ts
//
// astro:schema is Astro's re-export of Zod.  We simply re-export the real
// zod package so schema definitions in index.ts are parsed correctly.
// This also means z.object(), z.string() etc. all behave normally in tests.

import { z } from 'zod';
