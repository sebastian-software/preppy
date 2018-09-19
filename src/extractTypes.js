import { ScriptTarget, ModuleResolutionKind, createProgram, getPreEmitDiagnostics, flattenDiagnosticMessageText } from "typescript";

// Compiler based on code shown in the official docs:
// https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
function compile(fileNames, options) {
  const program = createProgram(fileNames, options)
  const emitResult = program.emit()

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

export default function extractTypes(fileName, outputFolder) {
  return compile([fileName], {
    declarationDir: outputFolder,
    declaration: true,
    emitDeclarationOnly: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    moduleResolution: ModuleResolutionKind.NodeJs,
    target: ScriptTarget.ES2017
  })
}
