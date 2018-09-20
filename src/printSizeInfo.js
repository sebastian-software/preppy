import gzipSize from "gzip-size"
import prettyBytes from "pretty-bytes"

export default async function printSizeInfo(code, filename, zipped) {
  const message = zipped ?
    prettyBytes(await gzipSize(code)) + " (gzipped)" :
    prettyBytes(code.length)

  console.log(`    - ${message}`)
}
