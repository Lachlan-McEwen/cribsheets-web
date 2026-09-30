declare module 'xlsx-populate' {
  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<{
      sheet(index: number): { cell(ref: string): { value(): unknown } }
    }>
  }
  export default XlsxPopulate
}
