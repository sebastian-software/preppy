/* eslint-disable complexity */
import { existsSync } from "fs"
import { join } from "path"

function isEmpty(obj) {
  for (const key in obj) {
    return false
  }

  return true
}

export default function getEntries(options) {
  const entries = {}

  const hasInputs = options.entryLib || options.entryNode || options.entryBrowser || options.entryCli

  const addRoot = (fileName) => join(options.root, fileName)

  if (options.entryLib) {
    if (!existsSync(options.entryLib)) {
      throw new Error(
        `Library entry point specified does not exist: ${options.entryLib}!`
      )
    }
    entries.library = options.entryLib
  } else if (!hasInputs) {
    entries.library = [
      "src/index.js",
      "src/index.jsx",
      "src/index.ts",
      "src/index.tsx"
    ].map(addRoot).filter(existsSync)[0]
  }

  if (options.entryNode) {
    if (!existsSync(options.entryNode)) {
      throw new Error(
        `NodeJS entry point specified does not exist: ${options.entryNode}!`
      )
    }
    entries.node = options.entryNode
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

  if (options.entryBrowser) {
    if (!existsSync(options.entryBrowser)) {
      throw new Error(
        `Browser entry point specified does not exist: ${options.entryBrowser}!`
      )
    }
    entries.browser = options.entryBrowser
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

  entries.binaries = {}

  if (options.entryCli) {
    if (!existsSync(options.entryCli)) {
      throw new Error(
        `CLI entry point specified does not exist: ${options.entryCli}!`
      )
    }

    entries.binaries.index = options.entryCli
  } else if (!hasInputs && options.output.binaries) {
    const binaryNames = Object.keys(options.output.binaries)

    binaryNames.forEach((name) => {
      // Check existance of all these files in priority of there order here.
      // The first existing file wins.
      const binaryEntry = [
        `src/${name}.js`,
        `src/${name}.ts`,
        `src/cli/${name}.js`,
        `src/cli/${name}.ts`,
        "src/cli.js",
        "src/cli.ts",
        "src/cli/index.js",
        "src/cli/index.ts"
      ].map(addRoot).filter(existsSync)[0]

      if (binaryEntry == null) {
        console.warn(`Did not found any matching entry for binary: ${name}!`)
      } else {
        entries.binaries[name] = binaryEntry
      }
    })
  }

  // Cleanup binaries if nothing is listed.
  if (isEmpty(entries.binaries)) {
    entries.binaries = null
  }

  if (entries.library == null && entries.binaries == null) {
    throw new Error("No entry points found!")
  }

  return entries
}
