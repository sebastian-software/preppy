/* istanbul ignore file */
import gzipSize from "gzip-size"
import prettyBytes from "pretty-bytes"

export default async function getFormattedSize(code, filename, zipped) {
  const message = zipped ?
    prettyBytes(await gzipSize(code)) + " (gz)" :
    prettyBytes(code.length)

  return message
}
