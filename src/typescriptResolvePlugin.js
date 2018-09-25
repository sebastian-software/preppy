import { statSync } from "fs"
import { extname } from "path"
import { nodeModuleNameResolver } from "typescript";

const resolveHost = {
  directoryExists(dirPath) {
    try {
      return statSync(dirPath).isDirectory()
    } catch (err) {
      return false
    }
  },

  fileExists(filePath) {
    try {
      return statSync(filePath).isFile()
    } catch (err) {
      return false
    }
  }
}

const extensions = [ ".ts", ".tsx" ]
const compilerOptions = {}

export default () => {
  return {
    name: "typescript-resolve",

    resolveId(importee, importer) {
      if (!importer) {
        return null
      }

      // Only help resolving requests from inside TypeScript sources
      if (!extensions.includes(extname(importer))) {
        return null
      }

      importer = importer.split("\\").join("/")

      const result = nodeModuleNameResolver(
        importee,
        importer,
        compilerOptions,
        resolveHost
      )

      if (result.resolvedModule && result.resolvedModule.resolvedFileName) {
        if (result.resolvedModule.resolvedFileName.endsWith(".d.ts")) {
          return null
        }

        return result.resolvedModule.resolvedFileName
      }

      return null
    }
  }
}
