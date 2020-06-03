import { join } from "path"

/* eslint-disable complexity */
export default function getOutputMatrix(opts, pkg) {
  const matrix = {}

  const output = opts.output
  if (output) {
    // Library Targets
    matrix.main = join(output, "index.cjs.js")
    matrix.module = join(output, "index.esm.js")

    // Browser Targets
    // We do not create browser and umd bundles in this mode.
    // Reason: Most libraries do not work correctly using these variants.
    matrix.browser = null
    matrix.umd = null

    // Binary Target
    matrix.binaries = {
      index: join(output, "index.js")
    }

    // Types Target (TypeScript)
    matrix.types = join(output, "index.d.ts")
  } else {
    /* eslint-disable dot-notation */

    // Library Targets
    matrix.main = pkg.main || null
    matrix.module = pkg.module || pkg["jsnext:main"] || null

    // Browser Targets
    matrix.umd = pkg.umd || pkg.unpkg || null
    matrix.browser = pkg.browser || null

    // Binary Target (supports multiple binaries)
    matrix.binaries = typeof pkg.bin === "object" ? pkg.bin : null

    // Types Target (TypeScript)
    matrix.types = pkg.types || null
  }

  return matrix
}
