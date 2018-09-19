/* eslint-disable immutable/no-mutation */
/* eslint-disable tree-shaking/no-side-effects-in-initialization */

import { extname, dirname, isAbsolute, resolve } from "path"
import { existsSync } from "fs"
import chalk from "chalk"
import fileExists from "file-exists"
import meow from "meow"
import { camelCase } from "lodash"
import { eachOfSeries } from "async"
import { get as getRoot } from "app-root-dir"
import { rollup } from "rollup"

import babelPlugin from "rollup-plugin-babel"
import cjsPlugin from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import replacePlugin from "rollup-plugin-replace"
import yamlPlugin from "rollup-plugin-yaml"

import extractTypes from "./extractTypes"
import getBanner from "./getBanner"

const ROOT = getRoot()
const PKG_CONFIG = require(resolve(ROOT, "package.json"))

let cache

/* eslint-disable no-console */

const command = meow(
  `
  Usage
    $ preppy

  Options
    --input-lib        Input file for library target [default = auto]
    --input-cli        Input file for cli target [default = auto]
    --output-folder    Configure the output folder [default = auto]

    -m, --sourcemap    Create a source map file during processing
    -v, --verbose      Verbose output mode [default = false]
    -q, --quiet        Quiet output mode [default = false]
`,
  {
    flags: {
      inputLib: {
        default: null
      },

      inputCli: {
        default: null
      },

      outputFolder: {
        default: null
      },

      sourcemap: {
        alias: "m",
        default: true
      },

      verbose: {
        alias: "v",
        default: false
      },

      quiet: {
        alias: "q",
        default: false
      }
    }
  }
)

process.env.BABEL_ENV = "development"

const verbose = command.flags.verbose
const quiet = command.flags.quiet

if (verbose) {
  console.log("Flags:", command.flags)
}

// Handle special case to generate a binary file based on config in package.json
const binaryConfig = PKG_CONFIG.bin
let binaryOutput = null
if (binaryConfig) {
  for (const name in binaryConfig) {
    binaryOutput = binaryConfig[name]
    break
  }
}

/* eslint-disable dot-notation */
const outputFileMatrix = {
  // Library Target
  "main": PKG_CONFIG["main"] || null,
  "module": PKG_CONFIG["module"] || PKG_CONFIG["jsnext:main"] || null,

  // Binary Target
  "bin": binaryOutput || null,

  // Types Target (TypeScript)
  "types": PKG_CONFIG["types"] || null
}

const outputFolder = command.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["main"] = `${outputFolder}/index.cjs.js`
  outputFileMatrix["module"] = `${outputFolder}/index.esm.js`
  outputFileMatrix["bin"] = `${outputFolder}/cli.js`
  outputFileMatrix["types"] = `${outputFolder}/index.d.js`
}

const name = PKG_CONFIG.name || camelCase(PKG_CONFIG.name)
const banner = getBanner(PKG_CONFIG)
const targets = {}

if (command.flags.inputLib) {
  if (!existsSync(command.flags.inputLib)) {
    throw new Error(`Library entry point specified does not exist: ${command.flags.inputLib}!`)
  }
  targets.library = command.flags.inputLib
} else if (!command.flags.inputCli) {
  targets.library = [ "src/index.js", "src/index.jsx", "src/index.ts", "src/index.tsx" ].filter(existsSync)[0]
}

if (command.flags.inputCli) {
  if (!existsSync(command.flags.inputCli)) {
    throw new Error(`CLI entry point specified does not exist: ${command.flags.inputCli}!`)
  }
  targets.binary = command.flags.inputCli
} else if (!command.flags.inputLib) {
  targets.binary = [ "src/cli.js", "src/cli.jsx", "src/cli.ts", "src/cli.tsx" ].filter(existsSync)[0]
}

if (targets.library == null && targets.binary == null) {
  throw new Error("No entry points found!")
}

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
