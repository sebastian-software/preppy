/* eslint-disable complexity, max-statements, max-depth */
import { dirname, extname, isAbsolute, join, relative, resolve } from "path"
import babelPlugin from "rollup-plugin-babel"
import chalk from "chalk"
import cjsPlugin from "rollup-plugin-commonjs"
import executablePlugin from "rollup-plugin-executable"

import figures from "figures"
import jsonPlugin from "rollup-plugin-json"
import ora from "ora"
import replacePlugin from "rollup-plugin-replace"
import yamlPlugin from "rollup-plugin-yaml"
import { rollup, watch } from "rollup"
import { terser as terserPlugin } from "rollup-plugin-terser"

import extractTypes from "./extractTypes"
import getBanner from "./getBanner"
import getEntries from "./getEntries"
import getFormattedSize from "./getFormattedSize"
import getOutputMatrix from "./getOutputMatrix"

import typescriptResolvePlugin from "./typescriptResolvePlugin"

let cache

const WATCH_OPTS = {
  exclude: "node_modules/**"
}

export default async function index(opts) {
  const { verbose, quiet, root } = opts
  const pkg = require(resolve(root, "package.json"))
  const name = pkg.name || dirname(root)
  const version = pkg.version || "0.0.0"

  const banner = getBanner(pkg)
  const output = getOutputMatrix(opts, pkg)
  const entries = getEntries(opts, output)

  if (opts.verbose) {
    console.log("Options:", opts)
  }

  if (opts.watch) {
  } else {
  }

  await bundleAll({
    verbose,
    quiet,
    name,
    version,
    root,
    banner,
    entries,
    output
  })
}

function bundleTypes(options) {
  if ([ ".ts", ".tsx" ].includes(extname(options.input))) {
    let progress = null
    if (!options.quiet) {
      progress = ora({
        interval: 30,
        text: generateMessage("Extracting", "...", options)
      }).start()
    }

    try {
      // Unfortunately there is no async API here.
      extractTypes(options)
    } catch (typeError) {
      handleError(typeError, progress)
    }

    if (!options.quiet) {
      progress.succeed(generateMessage("Extracting", "Done", options))
    }
  }
}

async function bundleAll({
  verbose,
  quiet,
  name,
  version,
  root,
  banner,
  entries,
  output
}) {
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

  if (entries.node) {
    if (output.main) {
      await bundleTo({
        ...base,
        input: entries.node,
        target: "node",
        format: "cjs",
        output: output.main
      })
    }

    if (output.module) {
      await bundleTo({
        ...base,
        input: entries.node,
        target: "node",
        format: "esm",
        output: output.module
      })
    }
  } else if (entries.library) {
    if (output.module) {
      await bundleTo({
        ...base,
        input: entries.library,
        target: "lib",
        format: "esm",
        output: output.module
      })
    }

    if (output.main) {
      await bundleTo({
        ...base,
        input: entries.library,
        target: "lib",
        format: "cjs",
        output: output.main
      })
    }

    if (!entries.browser) {
      if (output.umd) {
        await bundleTo({
          ...base,
          input: entries.library,
          target: "lib",
          format: "umd",
          output: output.umd
        })
      }
    }

    if (output.types) {
      bundleTypes({
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
      await bundleTo({
        ...base,
        input: entries.browser,
        target: "browser",
        format: "esm",
        output: output.browser
      })
    }

    if (output.umd) {
      await bundleTo({
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
        await bundleTo({
          ...base,
          input: entries.binaries[binaryName],
          target: "cli",
          format: "cjs",
          output: output.binaries[binaryName]
        })
      }
    }
  }
}

function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

function formatJSON(json) {
  return JSON.stringify(json, null, 2).replace(/\\"/g, "")
}

function getRollupInputOptions({
  name,
  verbose,
  version,
  input,
  format,
  target,
  output
}) {
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
  task,
  post,
  { name, version, root, target, input, output, format }
) {
  return `${task} ${name}-${version} [${chalk.blue(target.toUpperCase())}] ${chalk.blue(
    relative(root, input)
  )} ${figures.pointer} ${chalk.green(output)} [${chalk.green(
    format.toUpperCase()
  )}] ${post}`
}

function handleError(error, progress) {
  if (progress) {
    progress.fail(error.message)
  } else if (process.env.NODE_ENV === "test") {
    throw new Error(error.message)
  } else {
    console.error(error)
  }

  if (process.env.NODE_ENV !== "test") {
    process.exit(1)
  }
}

async function bundleTo(options) {
  let progress = null
  if (!options.quiet) {
    progress = ora({
      text: `${generateMessage("Bundling", "...", options)}`,
      interval: 30
    }).start()
  }

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
        "Bundling",
        await getFormattedSize(result.code, options.output, options.target !== "cli"),
        options
      )
    )
  }
}
