import path from "path"
import figures from "figures"
import terminalSpinner from "ora"

const DEFAULT_LIMIT = 50

function normalizePath(id) {
  return path
    .relative(process.cwd(), id)
    .split(path.sep)
    .join("/")
}

export default function progressPlugin(options = {}) {
  let loaded
  let { prefix, limit } = options

  const progress = terminalSpinner({
    interval: 30
  })

  if (!limit) {
    limit = DEFAULT_LIMIT
  }

  if (!prefix) {
    prefix = `Processing:`
  }

  return {
    name: "progress",

    buildStart() {
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

    generateBundle(outputOptions, bundle, isWrite) {
      progress.stop().clear()
    }
  }
}
