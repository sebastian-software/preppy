/*
 * Based upon https://github.com/rollup/rollup-plugin-run
 *
 * LICENSE:
 * Copyright (c) 2018 Rich Harris
 *
 * Permission is hereby granted by the authors of this software, to any person, to use the software for any purpose, free of charge, including the rights to run, read, copy, change, distribute and sell it, and including usage rights to any patents the authors may hold on it, subject to the following conditions:
 *
 * This license, or a link to its text, must be included with all copies of the software and any derivative works.
 *
 * Any modification to the software submitted to the authors may be incorporated into the software under the terms of this license.
 *
 * The software is provided "as is", without warranty of any kind, including but not limited to the warranties of title, fitness, merchantability and non-infringement. The authors have no obligation to provide support or updates for the software, and may not be held liable for any damages, claims or other liability arising from its use.
 */

import childProcess from "child_process"
import path from "path"

const exitMap = {}

/**
 * Returns map of exit codes of executed scripts
 *
 * @param [basePath] {string} Base path of project
 */
export async function getExitMap(basePath = "") {
  const exitMapEntries = await Promise.all(
    Object.entries(exitMap).reduce((prev, current) => {
      const [ key, value ] = current

      prev.push(
        // eslint-disable-next-line promise/prefer-await-to-then
        value.then((result) => {
          return [ key, result ]
        })
      )

      return prev
    }, [])
  )

  return exitMapEntries.reduce((prev, current) => {
    const [ key, value ] = current

    prev[path.relative(basePath, key)] = value

    return prev
  }, {})
}

export function advancedRollupRunPlugin(options = {}) {
  let input
  let proc

  const args = options.args || []
  const forkOptions = options.options || options
  delete forkOptions.args

  return {
    name: "advanced-run",

    options(opts) {
      let inputs = opts.input

      if (typeof inputs === "string") {
        inputs = [ inputs ]
      }

      if (typeof inputs === "object") {
        inputs = Object.values(inputs)
      }

      if (inputs.length > 1) {
        throw new Error(`rollup-plugin-advanced-run only works with a single entry point`)
      }

      input = path.resolve(inputs[0])
    },

    generateBundle(outputOptions, bundle, isWrite) {
      if (!isWrite) {
        this.error(
          `rollup-plugin-advanced-run currently only works with bundles that are written to disk`
        )
      }

      const dirName = outputOptions.dir || path.dirname(outputOptions.file)

      let dest

      for (const fileName in bundle) {
        const chunk = bundle[fileName]

        if (!("isEntry" in chunk)) {
          this.error(`rollup-plugin-advanced-run requires Rollup 0.65 or higher`)
        }

        if (!chunk.isEntry) continue

        if (chunk.modules[input]) {
          dest = path.join(dirName, fileName)
          break
        }
      }

      if (dest) {
        if (proc) proc.kill()
        proc = childProcess.fork(dest, args, forkOptions)

        exitMap[outputOptions.file] = new Promise((resolve) => {
          proc.on("exit", (code) => {
            resolve(code)
          })
        })
      } else {
        this.error(`rollup-plugin-advanced-run could not find output chunk`)
      }
    }
  }
}
