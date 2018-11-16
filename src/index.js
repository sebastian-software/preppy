/* eslint-disable complexity, max-statements, max-depth */
import { dirname, extname, relative, resolve, sep } from "path"
import chalk from "chalk"

import figures from "figures"
import terminalSpinner from "ora"
import { rollup, watch } from "rollup"

import extractTypes from "./extractTypes"
import getBanner from "./getBanner"
import getEntries from "./getEntries"
import getOutputMatrix from "./getOutputMatrix"
import getRollupInputOptions from "./getRollupInputOptions"
import getRollupOutputOptions from "./getRollupOutputOptions"
import getTasks from "./getTasks"
import { formatDuration } from "./progressPlugin"

export default async function index(opts) {
  const pkg = require(resolve(opts.root, "package.json"))

  const options = {
    ...opts,
    name: pkg.name || dirname(opts.root),
    version: pkg.version || "0.0.0",
    banner: getBanner(pkg),
    output: getOutputMatrix(opts, pkg)
  }

  options.entries = getEntries(options)

  const tasks = getTasks(options)

  if (options.watch) {
    console.log(chalk.bold(`Watching ${options.name}-${options.version}...`))
  } else {
    console.log(chalk.bold(`Building ${options.name}-${options.version}...`))
  }

  for (const task of tasks) {
    // We are unable to watch and regenerate TSC defintion files in watcher
    if (!options.watch || task.format !== "tsc") {
      console.log(
        `${chalk.yellow(figures.star)} Added: ${chalk.blue(
          relative(task.root, task.input)
        )} [${chalk.blue(task.target.toUpperCase())}] ${figures.pointer} ${chalk.green(
          task.output
        )} [${chalk.green(task.format.toUpperCase())}]`
      )
    }
  }

  if (options.watch) {
    const rollupTasks = []

    for (const task of tasks) {
      if (task.format !== "tsc") {
        rollupTasks.push({
          output: getRollupOutputOptions(task),
          watch: {
            exclude: "node_modules/**"
          },
          ...getRollupInputOptions(task)
        })
      }
    }

    watch(rollupTasks).on("event", watchHandler)
  } else {
    await Promise.all(tasks.map(executeTask))
  }
}

function watchHandler(watchEvent) {
  if (watchEvent.code === "FATAL" || watchEvent.code === "ERROR") {
    console.error(`${chalk.red(figures.cross)} ${formatError(watchEvent.error)}`)
    if (watchEvent.code === "FATAL") {
      process.exit(1)
    }
  }
}

async function executeTask(task) {
  return task.format === "tsc" ? bundleTypes(task) : bundleScript(task)
}

function formatError(error) {
  const lines = error.toString().split("\n")
  // Format in red color + replace working directory with empty string
  lines[0] = chalk.red(lines[0].replace(process.cwd() + sep, ""))
  return lines.join("\n")
}

function handleError(error, progress) {
  const formattedMsg = formatError(error)
  if (progress) {
    progress.fail(formattedMsg)
  } else if (process.env.NODE_ENV === "test") {
    throw new Error(formattedMsg)
  } else {
    console.error(formattedMsg)
  }

  if (process.env.NODE_ENV !== "test") {
    process.exit(1)
  }
}

function bundleTypes(options) {
  if ([ ".ts", ".tsx" ].includes(extname(options.input))) {
    const start = process.hrtime()

    let progress = null
    if (!options.quiet) {
      progress = terminalSpinner({
        interval: 30,
        text: `Extracting types from: ${relative(options.root, options.input)}`
      }).start()
    }

    try {
      // Unfortunately there is no async API here.
      extractTypes(options)
    } catch (typeError) {
      handleError(typeError, progress)
    }

    if (!options.quiet) {
      progress.succeed(
        `Written: ${chalk.green(relative(options.root, options.output))} in ${chalk.blue(
          formatDuration(start)
        )}`
      )
    }
  }
}

async function bundleScript(options) {
  let bundle
  try {
    bundle = await rollup(getRollupInputOptions(options))
  } catch (bundleError) {
    handleError(bundleError)
  }

  try {
    await bundle.write(getRollupOutputOptions(options))
  } catch (writeError) {
    handleError(writeError)
  }
}
