/* eslint-disable complexity, max-statements, max-depth */
import { dirname, extname, relative, resolve, sep } from "path"

import chalk from "chalk"
import figures from "figures"
import logSymbols from "log-symbols"
import notifier from "node-notifier"
import stackTrace from "stack-trace"
import terminalSpinner from "ora"
import { getExitMap } from "rollup-plugin-advanced-run"
import { rollup, watch } from "rollup"

import extractTypes from "./extractTypes"
import getBanner from "./getBanner"
import getEntries from "./getEntries"
import getOutputMatrix from "./getOutputMatrix"
import getRollupInputOptions from "./getRollupInputOptions"
import getRollupOutputOptions from "./getRollupOutputOptions"
import getTasks from "./getTasks"
import { formatDuration } from "./progressPlugin"
import { getTsCompilerOptions } from "./getTsCompilerOptions"
import { readJSON } from "./file"

function notify(options, message) {
  notifier.notify({
    title: `Preppy: ${options.name}-${options.version}`,
    message,
    sound: "Glass",

    // Brilliant: For any ‘group’, only one notification will ever be shown, replacing previously posted notifications.
    group: `Preppy: ${options.name}-${options.version}`
  })
}

export default async function index(opts) {
  // Change to detected root directory
  // This helps rollup plugins e.g. for Babel to use the correct config file.
  process.chdir(opts.root)

  const pkg = await readJSON(resolve(opts.root, "package.json"))

  const options = {
    ...opts,
    name: pkg.name || dirname(opts.root),
    version: pkg.version || "0.0.0",
    banner: getBanner(pkg),
    output: getOutputMatrix(opts, pkg),
    tsConfig: getTsCompilerOptions(opts)
  }

  options.entries = getEntries(options)

  if (options.verbose) {
    console.log("Entries:")
    for (const entryId in options.entries) {
      console.log(`- ${entryId}: ${options.entries[entryId]}`)
    }
  }

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

    watch(rollupTasks).on("event", watchHandler.bind(null, options))
  } else {
    await Promise.all(tasks.map(executeTask))
    if (options.notify) {
      notify(options, "Bundle complete")
    }

    // Look at exit codes
    const exitMap = await getExitMap(opts.root)
    const stream = process.stderr
    const successful = Object.entries(exitMap).reduce((prev, current) => {
      const [ binary, exitCode ] = current

      if (exitCode === 0 && !options.quiet) {
        stream.write(
          `${logSymbols.success} Executed: ${chalk.green(binary)} ${chalk.green(
            "succeeded"
          )}`
        )
      } else if (exitCode > 0) {
        stream.write(
          `${logSymbols.error} Executed: ${chalk.green(binary)} ${chalk.red(
            `failed with exit code ${exitCode}`
          )}`
        )
      }
      stream.write("\n")

      if (exitCode > 0) {
        return false
      }

      return prev
    }, true)

    return {
      successful,
      exitCodes: await getExitMap()
    }
  }

  return {
    successful: true
  }
}

function watchHandler(options, watchEvent) {
  if (watchEvent.code === "FATAL" || watchEvent.code === "ERROR") {
    console.error(`${chalk.red(figures.cross)} ${formatError(watchEvent.error)}`)
    if (options.notify) {
      notify(options, "Bundle update failed!")
    }
    if (watchEvent.code === "FATAL") {
      process.exit(1)
    }
  } else if (watchEvent.code === "BUNDLE_END") {
    if (options.notify) {
      notify(options, "Bundle updated")
    }
  }
}

async function executeTask(task) {
  return task.format === "tsc" ? bundleTypes(task) : bundleScript(task)
}

function formatStack(error) {
  const parsed = stackTrace.parse(error)

  const formatted = parsed
    .map((callSite) => {
      let path = relative(process.cwd(), callSite.getFileName() || "")
      path = path.replace(/^node_modules\b/, "~")
      let funcName = callSite.getMethodName() || callSite.getFunctionName()
      if (funcName) {
        funcName += "()"
      }
      return `  - ${chalk.white(path)}:${callSite.getLineNumber()} ${chalk.blue(
        funcName
      )}`
    })
    .join("\n")

  return `${chalk.underline("Stack Trace:")}\n${formatted}`
}

function formatError(error) {
  const stack = formatStack(error)
  const lines = error.toString().split("\n")

  // Format in red color + replace working directory with empty string
  lines[0] = chalk.red(lines[0].replace(process.cwd() + sep, ""))
  return `${lines.join("\n")}\n${stack}`
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
