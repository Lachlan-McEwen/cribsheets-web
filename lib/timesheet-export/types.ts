export type CellValue = string | number | boolean | null

/** Flat A1 address → value map (legacy SpreadSheetUpdater cell writes). */
export type CellSnapshot = Record<string, CellValue>

export type CellFontStyle = { fontFamily: string; fontSize: number }

export type GenerateTimesheetOptions = {
  /** Destination `.xlsm` path (created/overwritten). */
  outputPath: string
  cells: CellSnapshot
  /** EPPlus font overrides (e.g. spoilt meal tick). */
  cellFonts?: Record<string, CellFontStyle>
  /**
   * Workbook to copy before fill (e.g. prod round-trip). Defaults to legacy template for `casual`.
   */
  baseWorkbookPath?: string
  /** Use `template_casual.xlsm` and the casual data tab. Default false. */
  casual?: boolean
  /** Staff PNG path; omitted = no `AddImage`. */
  staffSignaturePngPath?: string
  /**
   * Copy `customXml/` + `docMetadata/` from a reference export and strip calcChain/printerSettings
   * (matches spike patching for apples-to-apples compares).
   */
  patchPackageFromReference?: string
}
