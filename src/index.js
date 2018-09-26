/* eslint-disable complexity, max-statements, max-depth */
import { extname, dirname, isAbsolute, resolve, join } from "path"
import chalk from "chalk"
import { rollup } from "rollup"
import { camelCase } from "lodash"

import babelPlugin from "rollup-plugin-babel"
import cjsPlugin from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import replacePlugin from "rollup-plugin-replace"
import yamlPlugin from "rollup-plugin-yaml"
import { terser as terserPlugin } from "rollup-plugin-terser"
import executablePlugin from "rollup-plugin-executable"

import extractTypes from "./extractTypes"
import printSizeInfo from "./printSizeInfo"
import getBanner from "./getBanner"
import getEntries from "./getEntries"
import getOutputMatrix from "./getOutputMatrix"

import typescriptResolvePlugin from "./typescriptResolvePlugin"

let cache

export default async function index(opts) {
  const { verbose, quiet, root } = opts
  const pkg = require(resolve(root, "package.json"))
  const name = pkg.name || dirname(root)
  const version = pkg.version || "0.0.0"
  const banner = getBanner(pkg)
  const entries = getEntries(opts)
  const output = getOutputMatrix(opts, pkg)

  if (opts.verbose) {
    console.log("Options:", opts)
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
  if (!output.main && !entries.binary) {
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
    if (verbose) {
      if (output.main || output.module) {
        console.log(">>> Node Entry:", entries.node)
      }
    }

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
    if (verbose) {
      if (output.main || output.module || output.umd || output.types) {
        console.log(">>> Library Entry:", entries.library)
      }
    }

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

    if ([ ".ts", ".tsx" ].includes(extname(entries.library))) {
      if (output.types) {
        if (!quiet) {
          console.log(
            `${chalk.green("  - Extracting types from")} ${chalk.magenta(name)}-${chalk.magenta(
              version
            )} as ${chalk.blue("tsdef".toUpperCase())} to ${chalk.green(dirname(output.types))}...`
          )
        }

        extractTypes({
          entry: entries.library,
          output: dirname(output.types),
          root,
          verbose,
          quiet
        })
      } else {
        console.warn(chalk.red.bold("  - Missing `types` entry in `package.json`!"))
      }
    }
  }

  if (entries.browser) {
    if (verbose) {
      if (output.browser || output.umd) {
        console.log(">>> Browser Entry:", entries.browser)
      }
    }

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

  if (entries.binary) {
    if (verbose) {
      if (output.binary) {
        console.log(">>> CLI Entry:", entries.binary)
      }
    }

    if (output.binary) {
      await bundleTo({
        ...base,
        input: entries.binary,
        target: "cli",
        format: "cjs",
        output: output.binary
      })
    }
  }
}

function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

async function bundleTo({
  verbose,
  quiet,
  root,
  name,
  version,
  banner,
  input,
  target,
  format,
  output
}) {
  if (!quiet) {
    /* eslint-disable max-len */
    console.log(
      `${chalk.yellow(">>> Bundling")} ${chalk.magenta(name)}-${chalk.magenta(version)} [${chalk.blue(target.toUpperCase())}] ▶ ${chalk.green(output)} [${chalk.blue(format.toUpperCase())}] ...`
    )
  }

  const prefix = "process.env."
  const variables = {
    [`${prefix}NAME`]: JSON.stringify(name),
    [`${prefix}VERSION`]: JSON.stringify(version),
    [`${prefix}TARGET`]: JSON.stringify(target)
  }

  const shebang = "#!/usr/bin/env node"
  const env = process.env.NODE_ENV || "development"

  const bundle = await rollup({
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
        envName: `${env}-${target}-${format}`,

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
      (env === "production" && (format === "umd" || target === "cli")) || (/\.min\./).exec(output) ? terserPlugin({
        toplevel: format === "esm" || format === "cjs",
        keep_classnames: true,
        keep_fnames: true,
        safari10: true,
        output: {
          ascii_only: true,
          semicolons: false
        }
      }) : null,
      target === "cli" ? executablePlugin() : null
    ].filter(Boolean)
  })

  const { code } = await bundle.write({
    format,
    name,
    banner: target === "cli" ? shebang + "\n\n" + banner : banner,
    sourcemap: true,
    file: join(root, output)
  })

  if (!quiet) {
    await printSizeInfo(code, output, target !== "cli")
  }
}
