/* eslint-disable complexity, max-statements, max-depth */
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "path"
import babelPlugin from "rollup-plugin-babel"
import chalk from "chalk"
import cjsPlugin from "rollup-plugin-commonjs"
import executablePlugin from "rollup-plugin-executable"

import figures from "figures"
import jsonPlugin from "rollup-plugin-json"
import replacePlugin from "rollup-plugin-replace"
import terminalSpinner from "ora"
import yamlPlugin from "rollup-plugin-yaml"
import { rollup, watch } from "rollup"
import { terser as terserPlugin } from "rollup-plugin-terser"

import extractTypes from "./extractTypes"
import getBanner from "./getBanner"
import getEntries from "./getEntries"
import getFormattedSize from "./getFormattedSize"
import getOutputMatrix from "./getOutputMatrix"
import progressPlugin from "./progressPlugin"
import typescriptResolvePlugin from "./typescriptResolvePlugin"

let cache

const WATCH_OPTS = {
  exclude: "node_modules/**"
}

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
        `${chalk.yellow(figures.star)} [${chalk.blue(task.target.toUpperCase())}] ${chalk.blue(
          relative(task.root, task.input)
        )} ${figures.pointer} ${chalk.green(task.output)} [${chalk.green(
          task.format.toUpperCase()
        )}]`
      )
    }
  }

  if (options.watch) {
    const rollupTasks = []

    for (const task of tasks) {
      if (task.format !== "tsc") {
        rollupTasks.push({
          output: getRollupOutputOptions(task),
          watch: WATCH_OPTS,
          ...getRollupInputOptions(task)
        })
      }
    }

    watch(rollupTasks).on("event", (watchEvent) => {
      if (watchEvent.code === "FATAL" || watchEvent.code === "ERROR") {
        console.error(`${chalk.red(figures.cross)} ${formatError(watchEvent.error)}`)
        if (watchEvent.code === "FATAL") {
          process.exit(1)
        }
      } else if (watchEvent.code === "BUNDLE_END") {
        watchEvent.output.forEach((output) => {
          console.log(
            `${chalk.green(figures.tick)} Written ${relative(options.root, output)} in ${watchEvent.duration}ms`
          )
        })
      }
    })
  } else {
    // Parallel execution. Confuses console messages right now. Not clearly faster.
    // Probably needs some better parallel execution
    // e.g. via https://github.com/facebook/jest/tree/master/packages/jest-worker
    // await Promise.all(tasks.map(executeTask))

    for (const task of tasks) {
      await executeTask(task)
    }
  }
}

function bundleTypes(options) {
  if ([ ".ts", ".tsx" ].includes(extname(options.input))) {
    const start = process.hrtime()

    let progress = null
    if (!options.quiet) {
      progress = terminalSpinner({
        interval: 30,
        text: generateMessage("...", options)
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
        generateMessage(`Done${formatDuration(start)}`, options)
      )
    }
  }
}

async function executeTask(task) {
  return task.format === "tsc" ? bundleTypes(task) : bundleTo(task)
}

function getTasks({ verbose, quiet, name, version, root, banner, entries, output }) {
  if (!output.main && !entries.binaries) {
    console.warn(chalk.red.bold("  - Missing `main` or `bin` entry in `package.json`!"))
  }

  const base = {
    verbose,
    quiet,
    root,
    name,
    version,
    banner
  }

  const tasks = []

  if (entries.node) {
    if (output.main) {
      tasks.push({
        ...base,
        input: entries.node,
        target: "node",
        format: "cjs",
        output: output.main
      })
    }

    if (output.module) {
      tasks.push({
        ...base,
        input: entries.node,
        target: "node",
        format: "esm",
        output: output.module
      })
    }
  } else if (entries.library) {
    if (output.module) {
      tasks.push({
        ...base,
        input: entries.library,
        target: "lib",
        format: "esm",
        output: output.module
      })
    }

    if (output.main) {
      tasks.push({
        ...base,
        input: entries.library,
        target: "lib",
        format: "cjs",
        output: output.main
      })
    }

    if (!entries.browser) {
      if (output.umd) {
        tasks.push({
          ...base,
          input: entries.library,
          target: "lib",
          format: "umd",
          output: output.umd
        })
      }
    }

    if (output.types) {
      tasks.push({
        ...base,
        input: entries.library,
        target: "lib",
        format: "tsc",
        output: output.types
      })
    }
  }

  if (entries.browser) {
    if (output.browser) {
      tasks.push({
        ...base,
        input: entries.browser,
        target: "browser",
        format: "esm",
        output: output.browser
      })
    }

    if (output.umd) {
      tasks.push({
        ...base,
        input: entries.browser,
        target: "lib",
        format: "umd",
        output: output.umd
      })
    }
  }

  if (entries.binaries) {
    if (output.binaries) {
      for (const binaryName in output.binaries) {
        tasks.push({
          ...base,
          input: entries.binaries[binaryName],
          target: "cli",
          format: "cjs",
          output: output.binaries[binaryName]
        })
      }
    }
  }

  return tasks
}

function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

function formatJSON(json) {
  return JSON.stringify(json, null, 2).replace(/\\"/g, "")
}

function getRollupInputOptions(options) {
  const { name, verbose, version, input, format, target, output } = options

  const prefix = "process.env."
  const variables = {
    [`${prefix}BUNDLE_NAME`]: JSON.stringify(name),
    [`${prefix}BUNDLE_VERSION`]: JSON.stringify(version),
    [`${prefix}BUNDLE_TARGET`]: JSON.stringify(target)
  }

  // This protected helper is required to make Preppy not optimizing itself here.
  const protectedEnv = process.env
  const env = protectedEnv.NODE_ENV
  if (env) {
    variables[`${prefix}NODE_ENV`] = JSON.stringify(env)
  }

  if (verbose) {
    console.log("Variables:", formatJSON(variables))
  }

  return {
    input,
    cache,
    onwarn: (error) => {
      console.warn(chalk.red(`  - ${error.message}`))
    },
    external(dependency) {
      // Very simple externalization:
      // We exclude all files from NodeJS resolve basically which are not relative to current file.
      // We also bundle absolute paths, these are just an intermediate step in Rollup resolving files and
      // as we do not support resolving from node_modules (we never bundle these) we only hit this code
      // path for originally local dependencies.
      return !(dependency === input || isRelative(dependency) || isAbsolute(dependency))
    },
    plugins: [
      progressPlugin(),
      replacePlugin(variables),
      cjsPlugin({
        include: "node_modules/**"
      }),
      typescriptResolvePlugin(),
      yamlPlugin(),
      jsonPlugin(),
      babelPlugin({
        // Rollup Setting: Prefer usage of a common library of helpers
        runtimeHelpers: format !== "umd",

        // We use envName to pass information about the build target and format to Babel
        envName: env ? `${env}-${target}-${format}` : `${target}-${format}`,

        // The Babel-Plugin is not using a pre-defined include, but builds up
        // its include list from the default extensions of Babel-Core.
        // Default Extensions: [".js", ".jsx", ".es6", ".es", ".mjs"]
        // We add TypeScript extensions here as well to be able to post-process
        // any TypeScript sources with Babel. This allows us for using presets
        // like "react" and plugins like "fast-async" with TypeScript as well.
        extensions: [ ".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx" ],

        // Do not transpile external code
        // https://github.com/rollup/rollup-plugin-babel/issues/48#issuecomment-211025960
        exclude: [ "node_modules/**", "**/*.json" ]
      }),
      (env === "production" && (format === "umd" || target === "cli")) ||
      (/\.min\./).exec(output) ?
        terserPlugin({
          toplevel: format === "esm" || format === "cjs",
          safari10: true,
          output: {
            ascii_only: true,
            semicolons: false
          }
        }) :
        null,
      target === "cli" ? executablePlugin() : null
    ].filter(Boolean)
  }
}

function getRollupOutputOptions({ banner, format, name, target, root, output }) {
  const shebang = "#!/usr/bin/env node"

  return {
    format,
    name,
    banner: target === "cli" ? `${shebang}\n\n${banner}` : banner,
    sourcemap: true,
    file: join(root, output)
  }
}

function generateMessage(
  post,
  { name, version, root, target, input, output, format }
) {
  return `[${chalk.blue(target.toUpperCase())}] ${chalk.blue(relative(root, input))} ${
    figures.pointer
  } ${chalk.green(output)} [${chalk.green(format.toUpperCase())}] ${post}`
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

function formatDuration(start) {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)
  const nano = diff[0] * NS_PER_SEC + diff[1]
  const ms = Math.round(nano / NS_TO_MS)

  return ` in ${ms}ms`
}

async function bundleTo(options) {
  let progress = null
  if (!options.quiet) {
    progress = terminalSpinner({
      text: `${generateMessage("...", options)}`,
      interval: 30
    }).start()
  }

  const start = process.hrtime()

  let bundle = null
  try {
    bundle = await rollup(getRollupInputOptions(options))
  } catch (bundleError) {
    handleError(bundleError, progress)
  }

  let result = null
  try {
    result = await bundle.write(getRollupOutputOptions(options))
  } catch (writeError) {
    handleError(writeError, progress)
  }

  if (!options.quiet) {
    progress.succeed(
      generateMessage(
        (await getFormattedSize(result.code, options.output, options.target !== "cli")) +
          formatDuration(start),
        options
      )
    )
  }
}
