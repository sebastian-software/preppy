/* eslint-disable id-length */
let ts

try {
  // eslint-disable-next-line global-require
  ts = require("typescript")
} catch {
  // ignore failures here (typescript = optional)
}

export function getTsCompilerOptions(opts) {
  if (!ts) {
    return
  }

  const { verbose } = opts
  const file = ts.findConfigFile(opts.root, ts.sys.fileExists)

  if (!file) {
    if (verbose) {
      console.log("No tsconfig found in", opts.root)
    }
    return
  }

  const readResult = ts.readConfigFile(file, ts.sys.readFile)

  if (readResult.error) {
    console.error("Error reading tsconfig:", readResult.error.messageText)
    return
  }

  const basePath = ts.getDirectoryPath(file)
  const config = ts.parseJsonConfigFileContent(readResult.config, ts.sys, basePath)

  if (config.errors && config.errors.length > 0) {
    config.errors.forEach((error) => {
      console.error("Error reading tsconfig:", error.messageText)
    })
    return
  }

  return config.options
}
