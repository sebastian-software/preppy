/* eslint-disable complexity */
export default function getOutputMatrix(command, PKG_CONFIG) {
  // Handle special case to generate a binary file based on config in package.json
  const binaryConfig = PKG_CONFIG.bin
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
    main: PKG_CONFIG["main"] || null,
    module: PKG_CONFIG["module"] || PKG_CONFIG["jsnext:main"] || null,

    // Browser Targets
    umd: PKG_CONFIG["umd"] || PKG_CONFIG["unpkg"] || null,
    browser: PKG_CONFIG["browser"] || null,

    // Binary Target
    bin: binaryOutput || null,

    // Types Target (TypeScript)
    types: PKG_CONFIG["types"] || null
  }

  const outputFolder = command.flags.outputFolder
  if (outputFolder) {
    matrix.main = `${outputFolder}/index.cjs.js`
    matrix.module = `${outputFolder}/index.esm.js`
    matrix.browser = `${outputFolder}/index.browser.esm.js`
    matrix.umd = `${outputFolder}/index.browser.umd.js`
    matrix.bin = `${outputFolder}/cli.js`
    matrix.types = `${outputFolder}/index.d.js`
  }

  return matrix
}
