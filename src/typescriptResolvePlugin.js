import { extname } from "path"
import { statSync } from "fs"

// eslint-disable-next-line id-length
let ts

try {
  // eslint-disable-next-line global-require
  ts = require("typescript")
} catch {
  // ignore failures here (typescript = optional)
}

const resolveHost = {
  directoryExists(dirPath) {
    try {
      return statSync(dirPath).isDirectory()
    } catch {
      /* istanbul ignore next */
      return false
    }
  },

  fileExists(filePath) {
    try {
      return statSync(filePath).isFile()
    } catch {
      /* istanbul ignore next */
      return false
    }
  }
}

const extensions = new Set([ ".ts", ".tsx" ])
const compilerOptions = {}

export default () => ({
  name: "typescript-resolve",

  resolveId(importee, importer) {
    if (!importer) {
      return null
    }

    // Only help resolving requests from inside TypeScript sources
    if (!extensions.has(extname(importer))) {
      /* istanbul ignore next */
      return null
    }

    const fixedImporter = importer.split("\\").join("/")

    if (!ts) {
      throw new Error("Please install package 'typescript'")
    }

    const result = ts.nodeModuleNameResolver(
      importee,
      fixedImporter,
      compilerOptions,
      resolveHost
    )

    if (result.resolvedModule && result.resolvedModule.resolvedFileName) {
      if (result.resolvedModule.resolvedFileName.endsWith(".d.ts")) {
        /* istanbul ignore next */
        return null
      }

      return result.resolvedModule.resolvedFileName
    }

    /* istanbul ignore next */
    return null
  }
})
