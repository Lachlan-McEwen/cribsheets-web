# Timesheet `.xlsm` export (Node)

Port of legacy `SpreadSheetUpdater.WriteSpreadSheet`:

1. Copy `template.xlsm` (or `baseWorkbookPath` for round-trips)
2. Fill cells with **xlsx-populate**
3. Optional staff PNG via **OOXML** (`AddImage` row 36 / col 1)
4. Optional package patch (`customXml` / strip calcChain) for prod-like compares

```ts
import { generateTimesheetFromDocument } from '../../lib/timesheet-export/index.ts'

await generateTimesheetFromDocument({
  outputPath: '/path/out.xlsm',
  timesheet: cassieDocument, // see legacy-types + fixtures/cassie-timesheet.json
  staffSignaturePngPath: '/path/sig.png',
})
```

**JSON** mirrors legacy `SAASTimesheet.Models`: `fortnightEnding`, `days[]` (`TimeSheetDay` with hours/minutes fields, crib penalties, country/recall fields), plus `user` (name, employeeNumber, unitStation, flags). Same shape as SQL-stored timesheet JSON; `User` was `[JsonIgnore]` on `Timesheet` in C# but is attached server-side at generate — we require `user` in the document.

**Tests:** `bun run excel:test` (parity + document builder vs .NET).
