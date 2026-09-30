import fs from 'node:fs'
import AdmZip from 'adm-zip'

/** SpreadSheetUpdater.AddImage(sheet, 36, 1, png) — EPPlus-compatible OOXML. */
export const LEGACY_SIGNATURE_ROW = 36
export const LEGACY_SIGNATURE_COL = 1
const SIGNATURE_HEIGHT_PX = 82
const SIGNATURE_OFFSET_PX = 2
const EMU_PER_PX = 9525
const SIGNATURE_NAME = 'Signature'
const SIGNATURE_MEDIA = 'xl/media/image1.Png'
const DRAWING_PATH = 'xl/drawings/drawing1.xml'
const DRAWING_RELS_PATH = 'xl/drawings/_rels/drawing1.xml.rels'
const IMAGE_REL_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'

export function readPngDimensions(pngFile: string): { width: number; height: number } {
  const buf = fs.readFileSync(pngFile)
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Not a PNG: ${pngFile}`)
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function pixel2Emu(px: number): number {
  return px * EMU_PER_PX
}

function signatureExtents(pngWidth: number, pngHeight: number): { cx: number; cy: number } {
  const heightPx = SIGNATURE_HEIGHT_PX
  const widthPx = Math.round(pngWidth * (heightPx / pngHeight))
  return { cx: pixel2Emu(widthPx), cy: pixel2Emu(heightPx) }
}

function nextNumericId(xml: string): number {
  let max = 0
  for (const m of xml.matchAll(/\bid="(\d+)"/g)) {
    max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

function nextRelId(relsXml: string): string {
  let max = 0
  for (const m of relsXml.matchAll(/\bId="rId(\d+)"/g)) {
    max = Math.max(max, Number(m[1]))
  }
  return `rId${max + 1}`
}

function findRelIdForTarget(relsXml: string, target: string): string | null {
  const re = new RegExp(`Id="(rId\\d+)"[^>]+Target="${target.replace('.', '\\.')}"`)
  return relsXml.match(re)?.[1] ?? null
}

function ensureImageRelationship(relsXml: string, relId: string, target: string): string {
  if (findRelIdForTarget(relsXml, target)) return relsXml
  if (relsXml.includes(`Id="${relId}"`)) return relsXml
  const rel = `<Relationship Id="${relId}" Type="${IMAGE_REL_TYPE}" Target="${target}"/>`
  return relsXml.replace('</Relationships>', `${rel}</Relationships>`)
}

function buildOneCellAnchor(relId: string, cNvId: number, cx: number, cy: number): string {
  const colOff = pixel2Emu(SIGNATURE_OFFSET_PX)
  const rowOff = pixel2Emu(SIGNATURE_OFFSET_PX)
  return (
    `<xdr:oneCellAnchor><xdr:from><xdr:col>${LEGACY_SIGNATURE_COL}</xdr:col>` +
    `<xdr:colOff>${colOff}</xdr:colOff><xdr:row>${LEGACY_SIGNATURE_ROW}</xdr:row>` +
    `<xdr:rowOff>${rowOff}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}" />` +
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${cNvId}" descr="" name="${SIGNATURE_NAME}" />` +
    `<xdr:cNvPicPr><a:picLocks noChangeAspect="1" /></xdr:cNvPicPr></xdr:nvPicPr>` +
    `<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relId}" cstate="print" />` +
    `<a:stretch><a:fillRect /> </a:stretch> </xdr:blipFill> <xdr:spPr> <a:xfrm> <a:off x="0" y="0" />  <a:ext cx="0" cy="0" /> </a:xfrm> <a:prstGeom prst="rect"> <a:avLst /> </a:prstGeom> </xdr:spPr></xdr:pic><xdr:clientData /></xdr:oneCellAnchor>`
  )
}

function stripExistingSignatureAnchor(drawingXml: string): string {
  const marker = `name="${SIGNATURE_NAME}"`
  let xml = drawingXml
  for (;;) {
    const nameIdx = xml.indexOf(marker)
    if (nameIdx < 0) break
    const start = xml.lastIndexOf('<xdr:oneCellAnchor', nameIdx)
    if (start < 0) break
    const end = xml.indexOf('</xdr:oneCellAnchor>', nameIdx)
    if (end < 0) break
    xml = xml.slice(0, start) + xml.slice(end + '</xdr:oneCellAnchor>'.length)
  }
  return xml
}

/** Permanent Timesheet tab only (`drawing1.xml`). */
export function addLegacyStaffSignature(xlsmPath: string, pngPath: string): void {
  const pngBytes = fs.readFileSync(pngPath)
  const { width, height } = readPngDimensions(pngPath)
  const { cx, cy } = signatureExtents(width, height)

  const zip = new AdmZip(xlsmPath)
  const drawingEntry = zip.getEntry(DRAWING_PATH)
  const relsEntry = zip.getEntry(DRAWING_RELS_PATH)
  if (!drawingEntry || !relsEntry) {
    throw new Error(`Missing ${DRAWING_PATH} or ${DRAWING_RELS_PATH} in ${xlsmPath}`)
  }

  let drawingXml = drawingEntry.getData().toString('utf8')
  let relsXml = relsEntry.getData().toString('utf8')

  drawingXml = stripExistingSignatureAnchor(drawingXml)

  const mediaTarget = '../media/image1.Png'
  let relId = findRelIdForTarget(relsXml, mediaTarget)
  if (!relId) {
    relId = nextRelId(relsXml)
    relsXml = ensureImageRelationship(relsXml, relId, mediaTarget)
  }

  const cNvId = nextNumericId(drawingXml)
  const anchor = buildOneCellAnchor(relId, cNvId, cx, cy)
  if (!drawingXml.includes('</xdr:wsDr>')) {
    throw new Error('drawing1.xml missing </xdr:wsDr>')
  }
  drawingXml = drawingXml.replace('</xdr:wsDr>', `${anchor}</xdr:wsDr>`)

  zip.updateFile(DRAWING_PATH, Buffer.from(drawingXml, 'utf8'))
  zip.updateFile(DRAWING_RELS_PATH, Buffer.from(relsXml, 'utf8'))

  const existing = zip.getEntry(SIGNATURE_MEDIA)
  if (existing) zip.updateFile(SIGNATURE_MEDIA, pngBytes)
  else zip.addFile(SIGNATURE_MEDIA, pngBytes)

  fs.writeFileSync(xlsmPath, zip.toBuffer())
}

export function extractSignatureAnchorXml(xlsmPath: string): string | null {
  const entry = new AdmZip(xlsmPath).getEntry(DRAWING_PATH)
  if (!entry) return null
  const d = entry.getData().toString('utf8')
  const idx = d.indexOf(`name="${SIGNATURE_NAME}"`)
  if (idx < 0) return null
  const start = d.lastIndexOf('<xdr:oneCellAnchor', idx)
  const end = d.indexOf('</xdr:oneCellAnchor>', idx) + '</xdr:oneCellAnchor>'.length
  return d.slice(start, end)
}
