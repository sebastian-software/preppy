import { dirname, join } from "path"

/* eslint-disable id-length */
let ts
try {
  ts = require("typescript")
} catch (importError) {}

// Compiler based on code shown in the official docs:
// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function compile(fileNames, options, verbose) {
  const program = ts.createProgram(fileNames, options)
  const emitResult = program.emit()

  /* istanbul ignore next */
  if (verbose) {
    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start
        )
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
      } else {
        console.log(`${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`)
      }
    })
  }
}

export default function extractTypes({ input, root, output, verbose, tsConfig }) {
  const outputDir = dirname(output)

  if (ts == null) {
    throw new Error(
      "Extracting types requires local installation of the peer dependency 'typescript'!"
    )
  }

  const defaults = {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2017
  }

  const configured = tsConfig || {}

  // Make sure that user configured paths are absolute.
  // Otherwise TypeScript as of v3.3 and v3.4 might crash.
  configured.declarationDir = ts.getNormalizedAbsolutePath(configured.declarationDir)
  configured.outDir = ts.getNormalizedAbsolutePath(configured.outDir)
  configured.rootDir = ts.getNormalizedAbsolutePath(configured.rootDir)
  if (configured.rootDirs) {
    configured.rootDirs = configured.rootDirs.map(ts.getNormalizedAbsolutePath)
  }

  const enforced = {
    declaration: true,
    declarationDir: join(root, outputDir),
    emitDeclarationOnly: true,
    jsx: "preserve",
    moduleResolution: ts.ModuleResolutionKind.NodeJs
  }

  const compilerOptions = {
    ...defaults,
    ...configured,
    ...enforced
  }

  if (verbose) {
    console.log(
      "Compiler options used for extracting types:",
      JSON.stringify(compilerOptions, null, 2)
    )
  }

  return compile([ input ], compilerOptions, verbose)
}
