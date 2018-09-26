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

  if (output) {
    matrix.main = join(output, "index.cjs.js")
    matrix.module = join(output, "index.esm.js")
    // We do not create browser and umd bundles in this mode.
    // Reason: Most libraries do not work correctly using these variants.
    matrix.browser = null
    matrix.umd = null
    matrix.binary = join(output, "cli.js")
    matrix.types = join(output, "index.d.ts")
  }

  return matrix
}
