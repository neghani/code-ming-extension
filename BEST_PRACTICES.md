# CodeMint extension: best practices

Avoid type/API mismatches, null handling bugs, and cross-boundary issues (e.g. using `SuggestItem.ref` when it doesn't exist). Follow these rules so the extension stays predictable and maintainable.

---

## 1. Type–runtime alignment

- **Define types from the real contract.** In `src/types.ts`, if the API or stored JSON can return `null`/`undefined` for a field (e.g. `catalogId`), type it as `string | null` or `string | undefined` so TypeScript forces handling at every use.
- **Don’t assume API shape matches extension types.** The app can return `catalogId: null`. Extension types should reflect “may be null” or the extension should normalize at the API boundary (e.g. in `api.ts` after `request`) so the rest of the code sees a single shape.

## 2. One source of truth for derived values

- **Ref is derived, not a property of SuggestItem.** Ref is always `` `@${type}/${slug}` ``. Never add or use `item.ref` on API/explore items; always derive it. Only `ManifestEntry` has `ref` because it’s stored in the manifest.
- **Document derived fields.** In `types.ts` or a short comment, state which IDs/refs are derived (e.g. “ref = @type/slug, not returned by API”) so future changes don’t reintroduce `.ref` on SuggestItem.

## 3. Null and empty-string safety

- **Validate before use.** For any value that might be null/undefined or empty and is used in a critical path (API body, manifest key, lookup), check once: e.g. `typeof x === "string" && x.trim().length > 0` before passing to APIs or `removeEntry`/`removeEntryByRef`.
- **Filter at boundaries.** When building arrays from external data (manifest, API response), filter to valid entries immediately (e.g. `catalogIds` for sync, `installedIds` for the webview, `valid` entries for list) so the rest of the code can assume non-empty strings where required.
- **Guard optional API calls.** If a call depends on an optional field (e.g. `trackUsage(catalog.id)`), only call when that field is present and non-empty; add an early-return in the API helper when the argument is invalid.

## 4. Cross-boundary data (webview, commands)

- **Validate message payloads.** For `onDidReceiveMessage` and command handlers that receive `item` or similar, validate required fields (e.g. `item?.type`, `item?.slug`) at the top and show a clear error and return if invalid. Don’t rely on the webview or caller always sending the same shape as `SuggestItem`.
- **Prefer explicit payload types.** Type the message payload and treat `item` as possibly partial; validate before using any field that must be a non-empty string.

## 5. Manifest and storage

- **Never pass null into manifest APIs.** `removeEntry(manifest, catalogId)` expects `catalogId: string`. Callers must branch: if the entry has a valid catalogId use `removeEntry`, else use `removeEntryByRef(manifest, entry.ref)`.
- **Normalize on write.** When writing to the manifest (e.g. in install), always persist a non-empty string for `catalogId` (fallback to `catalog.id` or `` `${type}:${slug}` `` if the API returns null), so readers never see null in the manifest for that field.

## 6. API request bodies

- **Sanitize arrays sent to the API.** Before calling endpoints that expect an array of strings (e.g. `catalogIds` for `/api/catalog/sync`), filter to `string` and non-empty so the body never contains `null` or `undefined` and never triggers schema validation errors (e.g. “Expected string, received null”).

## 7. Errors and logging

- **Log and surface failures.** Avoid silent catch blocks; at least log (`logWarn`/`logError`) and, for user-facing actions, show a short message (e.g. “File not found”, “Invalid item”) so the extension isn’t a black box when something goes wrong.
- **Use a single logger and “Show logs” command.** Every path can assume logs are available and discoverable.

## 8. Consistency across similar flows

- **One pattern for “remove”.** Both the Remove command and the Explore “Remove” action should resolve the manifest entry the same way (by catalogId when valid, else by ref) and remove via the same helpers (`removeEntry` / `removeEntryByRef`). Share the logic (e.g. `removeByCatalogId(catalogId, ref?)`) so both call it with the same contract.
- **One pattern for “installed”.** When the UI needs “is this item installed?”, use a single source (e.g. `getInstalledIds()` returning only valid string catalogIds) so the webview and commands don’t diverge.

## 9. Documentation and onboarding

- **Keep this file updated.** When new issues are found (e.g. a property used that doesn’t exist, or a new null source), add a bullet here. Use this list in code review for extension changes.

## 10. Quick reference

| Area        | Practice |
| ----------- | -------- |
| Types       | Match runtime: use `string \| null` where API/storage can be null; or normalize at boundary. |
| Ref         | Never use `item.ref` for API/explore items; derive `` `@${type}/${slug}` ``. Only ManifestEntry has ref. |
| Null safety | Validate/filter before passing IDs to manifest or API; guard optional calls (e.g. trackUsage). |
| Boundaries  | Validate webview/command payloads (`item?.type`, `item?.slug`); filter arrays (catalogIds, installedIds). |
| Manifest    | Never pass null to removeEntry; use removeEntryByRef when catalogId invalid; normalize catalogId on write. |
| API bodies  | Send only valid string arrays; filter null/empty before POST. |
| Errors      | Log and show user-facing message; avoid silent catch. |
| Consistency | One pattern for remove and for “installed”; share helpers. |
