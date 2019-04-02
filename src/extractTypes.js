import { dirname, join } from "path"
import {
  createProgram,
  flattenDiagnosticMessageText,
  getPreEmitDiagnostics,
  ModuleResolutionKind,
  ScriptTarget,
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
  const defaults = {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    target: ScriptTarget.ES2017,
  }

  const configured = tsConfig && tsConfig.compilerOptions || {}

  const enforced = {
    declaration: true,
    declarationDir: join(root, dirname(output)),
    emitDeclarationOnly: true,
    jsx: "preserve",
    moduleResolution: ModuleResolutionKind.NodeJs,
  }

  const compilerOptions = {
    ...defaults,
    ...configured,
    ...enforced,
  }

  if (verbose) {
    console.log(
      "Compiler options used for extracting types:",
      JSON.stringify(compilerOptions, null, 2)
    )
  }

  return compile(
    [input],
    compilerOptions,
    verbose
  )
}
