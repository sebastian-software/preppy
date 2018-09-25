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

  const outputFolder = opts.outputFolder
  if (outputFolder) {
    matrix.main = `${outputFolder}/index.cjs.js`
    matrix.module = `${outputFolder}/index.esm.js`
    matrix.browser = `${outputFolder}/browser.esm.js`
    matrix.umd = `${outputFolder}/browser.umd.js`
    matrix.bin = `${outputFolder}/cli.js`
    matrix.types = `${outputFolder}/index.d.js`
  }

  return matrix
}
