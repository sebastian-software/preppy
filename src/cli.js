/* eslint-disable immutable/no-mutation */
/* eslint-disable tree-shaking/no-side-effects-in-initialization */

import { extname, dirname, isAbsolute, resolve } from "path"
import chalk from "chalk"
import { camelCase } from "lodash"
import { get as getRoot } from "app-root-dir"
import { rollup } from "rollup"

import babelPlugin from "rollup-plugin-babel"
import cjsPlugin from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import replacePlugin from "rollup-plugin-replace"
import yamlPlugin from "rollup-plugin-yaml"

import parseCommandline from "./parseCommandline"
import extractTypes from "./extractTypes"
import getBanner from "./getBanner"
import getTargets from "./getTargets"
import getOutputMatrix from "./getOutputMatrix"

const ROOT = getRoot()
const PKG_CONFIG = require(resolve(ROOT, "package.json"))

let cache

/* eslint-disable no-console */

const command = parseCommandline()

process.env.BABEL_ENV = "development"

const verbose = command.flags.verbose
const quiet = command.flags.quiet

if (verbose) {
  console.log("Flags:", command.flags)
}

const name = PKG_CONFIG.name || camelCase(PKG_CONFIG.name)
const banner = getBanner(PKG_CONFIG)
const targets = getTargets(command)
const outputFileMatrix = getOutputMatrix(command, PKG_CONFIG)

async function bundleAll() {
  if (targets.library) {
    console.log(">>> Library Entry:", targets.library)
    await bundleTo({
      input: targets.library,
      target: "lib",
      format: "esm",
      output: outputFileMatrix["module"]
    })

    await bundleTo({
      input: targets.library,
      target: "lib",
      format: "cjs",
      output: outputFileMatrix["main"]
    })

    if ([ ".ts", ".tsx" ].includes(extname(targets.library))) {
      const definitionOutputFolder = dirname(outputFileMatrix.types)
      console.log(
        `${chalk.green(">>> Extracting types from")} ${chalk.magenta(PKG_CONFIG.name)}-${chalk.magenta(
          PKG_CONFIG.version
        )} as ${chalk.blue("tsdef".toUpperCase())} to ${chalk.green(definitionOutputFolder)}...`
      )

      extractTypes(targets.library, definitionOutputFolder)
    }
  }

  if (targets.binary) {
    console.log(">>> Binary Entry:", targets.binary)
    await bundleTo({
      input: targets.binary,
      target: "cli",
      format: "cjs",
      output: outputFileMatrix["bin"]
    })
  }

  console.log(chalk.green.bold("Done!"))
}

function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

function bundleTo({
  input,
  target,
  format,
  output
}) {
  if (!quiet) {
    /* eslint-disable max-len */
    console.log(
      `${chalk.green(">>> Bundling")} ${chalk.magenta(PKG_CONFIG.name)}-${chalk.magenta(
        PKG_CONFIG.version
      )} as ${chalk.blue(format.toUpperCase())} to ${chalk.green(output)}...`
    )
  }

  const prefix = "process.env."
  const variables = {
    [`${prefix}NAME`]: JSON.stringify(PKG_CONFIG.name),
    [`${prefix}VERSION`]: JSON.stringify(PKG_CONFIG.version),
    [`${prefix}TARGET`]: JSON.stringify(target)
  }

  return rollup({
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
      })
    ]
  })
    .then((bundle) =>
      bundle.write({
        format,
        name,
        banner: target === "binary" ? `#!/usr/bin/env node\n\n${banner}` : banner,
        sourcemap: command.flags.sourcemap,
        file: output
      })
    )
}

bundleAll()
