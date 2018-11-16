import path from "path"

import chalk from "chalk"
import figures from "figures"
import prettyBytes from "pretty-bytes"
import terminalSpinner from "ora"

const DEFAULT_LIMIT = 50

export function formatDuration(start) {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)
  const nano = diff[0] * NS_PER_SEC + diff[1]

  return `${Math.round(nano / NS_TO_MS)}ms`
}

function normalizePath(id) {
  return path
    .relative(process.cwd(), id)
    .split(path.sep)
    .join("/")
}

export default function progressPlugin(options = {}) {
  let loaded, start
  let { prefix, limit } = options

  const root = process.cwd()

  const progress = terminalSpinner({
    interval: 32
  })

  if (!limit) {
    limit = DEFAULT_LIMIT
  }

  if (!prefix) {
    prefix = `Bundling:`
  }

  return {
    name: "progress",

    buildStart() {
      start = process.hrtime()
      progress.start(prefix)
      loaded = 0
    },

    buildEnd() {
      progress.stop().clear()
    },

    load(id) {
      loaded += 1
    },

    transform(code, id) {
      const file = normalizePath(id)
      if (file.includes(":")) {
        return
      }

      const short = file.slice(-limit)
      progress.text = `${prefix} ${
        short !== file ? figures.ellipsis : ""
      }${short} [${loaded}]`
      progress.render()
    },

    async generateBundle(outputOptions, bundle, isWrite) {
      progress.stop().clear()

      for (const fileName in bundle) {
        const entry = bundle[fileName]
        console.log(
          `${chalk.green(figures.tick)} Written ${chalk.green(
            path.relative(root, outputOptions.file)
          )} in ${chalk.blue(formatDuration(start))} [${prettyBytes(entry.code.length)}]`
        )
      }
    }
  }
}
