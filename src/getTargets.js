import { existsSync } from "fs"

export default function getTargets(command) {
  const targets = {}

  if (command.flags.inputLib) {
    if (!existsSync(command.flags.inputLib)) {
      throw new Error(
        `Library entry point specified does not exist: ${command.flags.inputLib}!`
      )
    }
    targets.library = command.flags.inputLib
  } else if (!command.flags.inputCli) {
    targets.library = [
      "src/index.js",
      "src/index.jsx",
      "src/index.ts",
      "src/index.tsx"
    ].filter(existsSync)[0]
  }

  if (command.flags.inputBrowser) {
    if (!existsSync(command.flags.inputBrowser)) {
      throw new Error(
        `Browser entry point specified does not exist: ${command.flags.inputBrowser}!`
      )
    }
    targets.browser = command.flags.inputBrowser
  } else if (!command.flags.inputBrowser) {
    targets.browser = [
      "src/client/index.js",
      "src/client/index.jsx",
      "src/client/index.ts",
      "src/client/index.tsx",
      "src/browser/index.js",
      "src/browser/index.jsx",
      "src/browser/index.ts",
      "src/browser/index.tsx"
    ].filter(existsSync)[0]
  }

  if (command.flags.inputCli) {
    if (!existsSync(command.flags.inputCli)) {
      throw new Error(
        `CLI entry point specified does not exist: ${command.flags.inputCli}!`
      )
    }
    targets.binary = command.flags.inputCli
  } else if (!command.flags.inputLib) {
    targets.binary = [
      "src/cli.js",
      "src/cli.ts",
      "src/cli/index.js",
      "src/cli/index.ts"
    ].filter(existsSync)[0]
  }

  if (targets.library == null && targets.binary == null) {
    throw new Error("No entry points found!")
  }

  return targets
}
