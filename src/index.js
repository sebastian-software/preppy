import { extname, dirname, isAbsolute, resolve } from "path"
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

export default function index(opts) {
  const pkg = require(resolve(opts.root, "package.json"))
  const name = pkg.name || camelCase(pkg.name)
  const version = pkg.version || "1.0.0"
  const banner = getBanner(pkg)
  const entries = getEntries(opts)
  const output = getOutputMatrix(opts, pkg)

  bundleAll({
    name,
    version,
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
  banner,
  entries,
  output
}) {
  if (!output.main && !entries.binary) {
    console.warn(chalk.red.bold("Missing `main` or `bin` entry in `package.json`!"))
  }

  const base = {
    verbose,
    quiet,
    name,
    version,
    banner
  }

  if (entries.node) {
    console.log(">>> NodeJS Entry:", entries.node)

    await bundleTo({
      ...base,
      input: entries.node,
      target: "node",
      format: "cjs",
      output: output.main
    })

    await bundleTo({
      ...base,
      input: entries.node,
      target: "node",
      format: "esm",
      output: output.module
    })
  } else if (entries.library) {
    console.log(">>> Library Entry:", entries.library)
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
          name,
          version,
          banner,
          input: entries.library,
          target: "lib",
          format: "umd",
          output: output.umd
        })
      }
    }

    if ([ ".ts", ".tsx" ].includes(extname(entries.library))) {
      if (output.types) {
        console.log(
          `${chalk.green(">>> Extracting types from")} ${chalk.magenta(name)}-${chalk.magenta(
            version
          )} as ${chalk.blue("tsdef".toUpperCase())} to ${chalk.green(dirname(output.types))}...`
        )

        extractTypes(entries.library, dirname(output.types), verbose)
      } else {
        console.warn(chalk.red.bold("Missing `types` entry in `package.json`!"))
      }
    }
  }

  if (entries.browser) {
    console.log(">>> Browser Entry:", entries.browser)

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
    console.log(">>> Binary Entry:", entries.binary)
    await bundleTo({
      verbose,
      quiet,
      ...base,
      input: entries.binary,
      target: "cli",
      format: "cjs",
      output: output.binary
    })
  }

  console.log(chalk.green.bold("🎉 Done!"))
}

function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

async function bundleTo({
  verbose,
  quiet,
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
      `${chalk.green(">>> Bundling")} ${chalk.magenta(name)}-${chalk.magenta(
        version
      )} as ${chalk.blue(format.toUpperCase())} to ${chalk.green(output)}...`
    )
  }

  const prefix = "process.env."
  const variables = {
    [`${prefix}NAME`]: JSON.stringify(name),
    [`${prefix}VERSION`]: JSON.stringify(version),
    [`${prefix}TARGET`]: JSON.stringify(target)
  }

  const shebang = "#!/usr/bin/env node"

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
        runtimeHelpers: true,

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
      format === "umd" || target === "cli" || (/\.min\./).exec(output) ? terserPlugin({
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
    file: output
  })

  await printSizeInfo(code, output, target !== "cli")
}
