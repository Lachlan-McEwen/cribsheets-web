# Excel generation spike

Compares **Node** libraries against a prod `.xlsm` in `legacy/CribSheets/examples/`.

```powershell
bun run setup:legacy   # if templates/examples are not present locally
bun run excel:spike
```

Flow:

1. Read tracked cells from the CASSIE prod example (SheetKit).
2. **Round-trip:** copy prod `.xlsm`, rewrite the same cells (.NET / xlsx-populate).
3. **Production path:** copy `template.xlsm`, apply cells + signature (Node `lib/timesheet-export` and .NET EPPlus).
4. Patch: restore `customXml` / `docMetadata` from prod; strip `calcChain` / printer settings. Do **not** paste sheet3–5 XML from prod after editing sheet1 (sharedStrings indices break).

**Open in Excel:** try `cassie-dotnet-roundtrip.xlsm` first, then `cassie-sheetjs-roundtrip.xlsm` / `cassie-sheetjs-from-template.xlsm`. SheetJS CE uses `bookVBA: true` (see `generate-sheetjs.ts`). ExcelJS/SheetKit are not in the default run.

Outputs go to `scripts/excel-spike/output/` (gitignored).

Production export code lives in **`lib/timesheet-export/`**. Parity vs .NET: `bun run excel:parity`. Signature-only smoke: `bun run excel:signature-node`.

Full cell map and product rules: [../../docs/legacy-export-spec.md](../../docs/legacy-export-spec.md).

**Package preservation audit** (ActiveX, controls, styles, VBA hash):

```powershell
bun run excel:inspect
```

Writes `output/preservation-audit.json`. SheetJS CE keeps `vbaProject.bin` bytes but drops ActiveX/controls/drawings — not export-safe for authoriser parity.
