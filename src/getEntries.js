/* eslint-disable complexity */
import { existsSync } from "fs"
import { join } from "path"

export default function getEntries(opts) {
  const entries = {}

  const hasInputs = opts.entryLib || opts.entryNode || opts.entryBrowser || opts.entryCli

  const addRoot = (fileName) => join(opts.root, fileName)

  if (opts.entryLib) {
    if (!existsSync(opts.entryLib)) {
      throw new Error(
        `Library entry point specified does not exist: ${opts.entryLib}!`
      )
    }
    entries.library = opts.entryLib
  } else if (!hasInputs) {
    entries.library = [
      "src/index.js",
      "src/index.jsx",
      "src/index.ts",
      "src/index.tsx"
    ].map(addRoot).filter(existsSync)[0]
  }

  if (opts.entryNode) {
    if (!existsSync(opts.entryNode)) {
      throw new Error(
        `NodeJS entry point specified does not exist: ${opts.entryNode}!`
      )
    }
    entries.node = opts.entryNode
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
    ].map(addRoot).filter(existsSync)[0]
  }

  if (opts.entryBrowser) {
    if (!existsSync(opts.entryBrowser)) {
      throw new Error(
        `Browser entry point specified does not exist: ${opts.entryBrowser}!`
      )
    }
    entries.browser = opts.entryBrowser
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
    ].map(addRoot).filter(existsSync)[0]
  }

  if (opts.entryCli) {
    if (!existsSync(opts.entryCli)) {
      throw new Error(
        `CLI entry point specified does not exist: ${opts.entryCli}!`
      )
    }
    entries.binary = opts.entryCli
  } else if (!hasInputs) {
    entries.binary = [
      "src/cli.js",
      "src/cli.ts",
      "src/cli/index.js",
      "src/cli/index.ts"
    ].map(addRoot).filter(existsSync)[0]
  }

  if (entries.library == null && entries.binary == null) {
    throw new Error("No entry points found!")
  }

  return entries
}
