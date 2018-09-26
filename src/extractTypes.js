import { join } from "path"
import { ScriptTarget, ModuleResolutionKind, createProgram, getPreEmitDiagnostics, flattenDiagnosticMessageText } from "typescript";

// Compiler based on code shown in the official docs:
// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function compile(fileNames, options, verbose) {
  const program = createProgram(fileNames, options)
  const emitResult = program.emit()

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

export default function extractTypes({ entry, root, output, verbose }) {
  return compile([entry], {
    declarationDir: join(root, output),
    declaration: true,
    emitDeclarationOnly: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    moduleResolution: ModuleResolutionKind.NodeJs,
    target: ScriptTarget.ES2017
  }, verbose)
}
