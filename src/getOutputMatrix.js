import { join } from "path"

/* eslint-disable complexity */
export default function getOutputMatrix(opts, pkg) {
  // Handle special case to generate a binary file based on config in package.json
  const binaryConfig = pkg.bin
  let binaryOutput = null
  if (binaryConfig) {
    for (const name in binaryConfig) {
      binaryOutput = binaryConfig[name]
      break
    }
  }

  /* eslint-disable dot-notation */
  const matrix = {
    // Library Targets
    main: pkg["main"] || null,
    module: pkg["module"] || pkg["jsnext:main"] || null,

    // Browser Targets
    umd: pkg["umd"] || pkg["unpkg"] || null,
    browser: pkg["browser"] || null,

    // Binary Target
    binary: binaryOutput || null,

    // Types Target (TypeScript)
    types: pkg["types"] || null
  }

  const output = opts.output
  const appRoot = opts.root

  if (output) {
    matrix.main = join(appRoot, output, "index.cjs.js")
    matrix.module = join(appRoot, output, "index.esm.js")
    matrix.browser = join(appRoot, output, "browser.esm.js")
    matrix.umd = join(appRoot, output, "browser.umd.js")
    matrix.bin = join(appRoot, output, "cli.js")
    matrix.types = join(appRoot, output, "index.d.ts")
  }

  return matrix
}
