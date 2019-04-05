import ts from "typescript"

export function getTsCompilerOptions(opts) {
  const { verbose } = opts
  const file = ts.findConfigFile(opts.root, ts.sys.fileExists)

  if (!file) {
    if (verbose) {
      console.error("No tsconfig found in", opts.root)
    }
    return
  }

  const readResult = ts.readConfigFile(file, ts.sys.readFile)

  if (readResult.error) {
    console.error("Error reading tsconfig:", readResult.error)
    return
  }

  const basePath = ts.getDirectoryPath(file)
  const config = ts.parseJsonConfigFileContent(readResult.config, ts.sys, basePath)

  return config.options
}
