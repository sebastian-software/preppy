import { dirname, isAbsolute, join } from "path"
import {
  createProgram,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
  ModuleResolutionKind,
  ScriptTarget
} from "typescript"

// Compiler based on code shown in the official docs:
// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function compile(fileNames, options, verbose) {
  const program = createProgram(fileNames, options)
  const emitResult = program.emit()

  /* istanbul ignore next */
  if (verbose) {
    const allDiagnostics = getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start
        )
        const message = flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        console.log(
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        )
      } else {
        console.log(`${flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`)
      }
    })
  }
}

export default function extractTypes({ input, root, output, verbose, tsConfig }) {
  const outputDir = dirname(output)

  function makeAbsolute(anyPath) {
    if (anyPath && !isAbsolute(anyPath)) {
      return join(root, outputDir)
    }

    return anyPath
  }

  const defaults = {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    target: ScriptTarget.ES2017
  }

  const configured = tsConfig ? tsConfig.compilerOptions : {}

  // Make sure that user configured paths are absolute.
  // Otherwise TypeScript as of v3.3 and v3.4 might crash.
  configured.rootDir = makeAbsolute(configured.rootDir)
  if (configured.rootDirs) {
    configured.rootDirs = configured.rootDirs.map(makeAbsolute)
  }
  configured.outDir = makeAbsolute(configured.outDir)

  const enforced = {
    declaration: true,
    declarationDir: join(root, outputDir),
    emitDeclarationOnly: true,
    jsx: "preserve",
    moduleResolution: ModuleResolutionKind.NodeJs
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

  return compile(
    [ input ],
    compilerOptions,
    verbose
  )
}
