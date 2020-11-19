/* eslint-disable complexity */
import { existsSync } from "fs"
import { join } from "path"

function isEmpty(obj) {
  for (const key in obj) {
    return false
  }

  return true
}

const SOURCE_EXTENSIONS = [ ".js", ".jsx", ".ts", ".tsx" ]

export function expandExtensions(fileList) {
  const result = []
  fileList.forEach((name) => {
    SOURCE_EXTENSIONS.forEach((ext) => {
      result.push(`${name}${ext}`)
    })
  })
  return result
}

export default function getEntries(options) {
  const entries = {}

  const hasInputs =
    options.entryLib || options.entryNode || options.entryBrowser || options.entryCli

  const addRoot = (fileName) => join(options.root, fileName)

  if (options.entryLib) {
    if (!existsSync(options.entryLib)) {
      throw new Error(`Library entry point specified does not exist: ${options.entryLib}!`)
    }
    entries.library = options.entryLib
  } else if (!hasInputs) {
    entries.library = expandExtensions([ "src/index" ]).map(addRoot).filter(existsSync)[0]
  }

  if (options.entryNode) {
    if (!existsSync(options.entryNode)) {
      throw new Error(`NodeJS entry point specified does not exist: ${options.entryNode}!`)
    }
    entries.node = options.entryNode
  } else if (!hasInputs) {
    entries.node = expandExtensions([
      "src/node",
      "src/server",
      "src/node/index",
      "src/server/index"
    ])
      .map(addRoot)
      .filter(existsSync)[0]
  }

  if (options.entryBrowser) {
    if (!existsSync(options.entryBrowser)) {
      throw new Error(`Browser entry point specified does not exist: ${options.entryBrowser}!`)
    }
    entries.browser = options.entryBrowser
  } else if (!hasInputs) {
    entries.browser = expandExtensions([
      "src/client",
      "src/browser",
      "src/client/index",
      "src/browser/index"
    ])
      .map(addRoot)
      .filter(existsSync)[0]
  }

  entries.binaries = {}

  if (options.entryCli) {
    if (!existsSync(options.entryCli)) {
      throw new Error(`CLI entry point specified does not exist: ${options.entryCli}!`)
    }

    entries.binaries.index = options.entryCli
  } else if (!hasInputs && options.output.binaries) {
    const binaryNames = Object.keys(options.output.binaries)

    binaryNames.forEach((name) => {
      // Check existence of all these files in priority of there order here.
      // The first existing file wins.
      const binaryEntry = expandExtensions([
        `src/${name}`,
        `src/cli/${name}`,
        "src/cli",
        "src/cli/index"
      ])
        .map(addRoot)
        .filter(existsSync)[0]

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
