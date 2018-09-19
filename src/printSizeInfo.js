import { basename } from "path"

import brotliSize from "brotli-size"
import chalk from "chalk"
import gzipSize from "gzip-size"
import prettyBytes from "pretty-bytes"

function formatSize(size, filename, type, raw) {
  const pretty = raw ? `${size} B` : prettyBytes(size)
  const color = size < 5000 ? "green" : size > 40000 ? "red" : "yellow"
  const MAGIC_INDENTATION = 11
  return `${" ".repeat(MAGIC_INDENTATION - pretty.length)}${chalk[color](
    pretty
  )}: ${chalk.white(basename(filename))}.${type}`
}

export default async function printSizeInfo(code, filename, useBytes) {
  const gzip = formatSize(await gzipSize(code), filename, "gz", useBytes)
  const brotli = formatSize(await brotliSize(code), filename, "br", useBytes)
  console.log(`${gzip}\n${brotli}`)
}
