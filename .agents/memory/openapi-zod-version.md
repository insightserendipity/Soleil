---
name: OpenAPI integer and Zod version
description: Compatibility constraint between the workspace's OpenAPI generator and installed Zod runtime.
---

The generated validation package currently targets Zod v3, so OpenAPI integer schemas produce unsupported `z.int()` calls. Use numeric schemas unless the workspace's Zod generation/runtime is upgraded together.

**Why:** Codegen can succeed while the chained library typecheck fails on generated `z.int()` references.

**How to apply:** Before adding integer fields to `lib/api-spec/openapi.yaml`, confirm the generated Zod version and keep schema/runtime capabilities aligned.