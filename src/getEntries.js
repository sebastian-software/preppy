import { existsSync } from "fs"

export default function getEntries(command) {
  const entries = {}

  const flags = command.flags
  const hasInputs = flags.entryLib || flags.entryNode || flags.entryBrowser || flags.entryCli

  if (flags.entryLib) {
    if (!existsSync(flags.entryLib)) {
      throw new Error(
        `Library entry point specified does not exist: ${flags.entryLib}!`
      )
    }
    entries.library = flags.entryLib
  } else if (!hasInputs) {
    entries.library = [
      "src/index.js",
      "src/index.jsx",
      "src/index.ts",
      "src/index.tsx"
    ].filter(existsSync)[0]
  }

  if (flags.entryNode) {
    if (!existsSync(flags.entryNode)) {
      throw new Error(
        `NodeJS entry point specified does not exist: ${flags.entryNode}!`
      )
    }
    entries.node = flags.entryNode
  } else if (!hasInputs) {
    entries.node = [
      "src/node.js",
      "src/node.jsx",
      "src/node.ts",
      "src/node.tsx",
      "src/server.js",
      "src/server.jsx",
      "src/server.ts",
      "src/server.tsx",
      "src/node/index.js",
      "src/node/index.jsx",
      "src/node/index.ts",
      "src/node/index.tsx",
      "src/server/index.js",
      "src/server/index.jsx",
      "src/server/index.ts",
      "src/server/index.tsx"
    ].filter(existsSync)[0]
  }

  if (flags.entryBrowser) {
    if (!existsSync(flags.entryBrowser)) {
      throw new Error(
        `Browser entry point specified does not exist: ${flags.entryBrowser}!`
      )
    }
    entries.browser = flags.entryBrowser
  } else if (!hasInputs) {
    entries.browser = [
      "src/client.js",
      "src/client.jsx",
      "src/client.ts",
      "src/client.tsx",
      "src/browser.js",
      "src/browser.jsx",
      "src/browser.ts",
      "src/browser.tsx",
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

  if (flags.entryCli) {
    if (!existsSync(flags.entryCli)) {
      throw new Error(
        `CLI entry point specified does not exist: ${flags.entryCli}!`
      )
    }
    entries.binary = flags.entryCli
  } else if (!hasInputs) {
    entries.binary = [
      "src/cli.js",
      "src/cli.ts",
      "src/cli/index.js",
      "src/cli/index.ts"
    ].filter(existsSync)[0]
  }

  if (entries.library == null && entries.binary == null) {
    throw new Error("No entry points found!")
  }

  return entries
}
