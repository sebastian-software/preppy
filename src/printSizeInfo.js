/* istanbul ignore file */
import gzipSize from "gzip-size"
import prettyBytes from "pretty-bytes"
import chalk from "chalk"

export default async function printSizeInfo(code, filename, zipped) {
  const message = zipped ?
    prettyBytes(await gzipSize(code)) + " (gzipped)" :
    prettyBytes(code.length)

  console.log(`  ${chalk.green("✓")} ${message}`)
}
