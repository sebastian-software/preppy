/* eslint-disable immutable/no-mutation */
/* eslint-disable tree-shaking/no-side-effects-in-initialization */

import { isAbsolute, resolve } from "path"
import chalk from "chalk"
import fileExists from "file-exists"
import meow from "meow"
import { camelCase } from "lodash"
import { eachOfSeries } from "async"
import { get as getRoot } from "app-root-dir"
import { rollup } from "rollup"

import cjsPlugin from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import replacePlugin from "rollup-plugin-replace"
import yamlPlugin from "rollup-plugin-yaml"

import createBabelConfig from "./createBabelConfig"
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
    --input-node       Input file for NodeJS target [default = auto]
    --input-binary     Input file for Binary target [default = auto]
    --output-folder    Configure the output folder [default = auto]

    -m, --sourcemap    Create a source map file during processing
    -v, --verbose      Verbose output mode [default = false]
    -q, --quiet        Quiet output mode [default = false]
`,
  {
    flags: {
      inputNode: {
        default: null
      },

      inputBinary: {
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
  // NodeJS Target
  "node-commonjs": PKG_CONFIG["main"] || null,
  "node-esmodule": PKG_CONFIG["module"] || PKG_CONFIG["jsnext:main"] || null,

  // Binary Target
  "binary-commonjs": binaryOutput || null
}

const outputFolder = command.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["node-commonjs"] = `${outputFolder}/node.commonjs.js`
  outputFileMatrix["node-esmodule"] = `${outputFolder}/node.esmodule.js`
  outputFileMatrix["binary-commonjs"] = `${outputFolder}/binary.js`
}

// Rollups support these formats: 'amd', 'cjs', 'es', 'iife', 'umd'
const format2Rollup = {
  commonjs: "cjs",
  esmodule: "es"
}

const name = PKG_CONFIG.name || camelCase(PKG_CONFIG.name)
const banner = getBanner(PKG_CONFIG)
const targets = {}
const formats = [ "esmodule", "commonjs" ]

if (command.flags.inputNode) {
  targets.node = [ command.flags.inputNode ]
} else {
  targets.node = [ "src/index.js", "src/main.js" ]
}

if (command.flags.inputBinary) {
  targets.binary = [ command.flags.inputBinary ]
} else {
  targets.binary = [ "src/binary.js", "src/script.js", "src/cli.js" ]
}

/* eslint-disable max-params */
try {
  eachOfSeries(targets, (envInputs, targetId, envCallback) => {
    const input = lookupBest(envInputs)
    if (input) {
      if (!quiet) {
        console.log(`Using input ${chalk.blue(input)} for target ${chalk.blue(targetId)}`)
      }

      eachOfSeries(
        formats,
        (format, formatIndex, formatCallback) => {
          const transpilers = createBabelConfig()

          eachOfSeries(
            transpilers,
            (currentTranspiler, transpilerId, variantCallback) => {
              const outputFile = outputFileMatrix[`${targetId}-${format}`]
              if (outputFile) {
                return bundleTo({
                  input,
                  targetId,
                  currentTranspiler,
                  format,
                  outputFile,
                  variantCallback
                })
              } else {
                return variantCallback(null)
              }
            },
            formatCallback
          )
        },
        envCallback
      )
    } else {
      envCallback(null)
    }
  })
} catch (error) {
  /* eslint-disable no-process-exit */
  console.error(error)
  process.exit(1)
}

function lookupBest(candidates) {
  const filtered = candidates.filter(fileExists.sync)
  return filtered[0]
}

function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

function bundleTo({
  input,
  targetId,
  currentTranspiler,
  format,
  outputFile,
  variantCallback
}) {
  if (!quiet) {
    /* eslint-disable max-len */
    console.log(
      `${chalk.green(">>> Bundling")} ${chalk.magenta(PKG_CONFIG.name)}-${chalk.magenta(
        PKG_CONFIG.version
      )} defined as ${chalk.blue(format)} to ${chalk.green(outputFile)}...`
    )
  }

  const prefix = "process.env."
  const variables = {
    [`${prefix}NAME`]: JSON.stringify(PKG_CONFIG.name),
    [`${prefix}VERSION`]: JSON.stringify(PKG_CONFIG.version),
    [`${prefix}TARGET`]: JSON.stringify(targetId)
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
      // We also bundle absolute paths, these are just an intermediate step in rollup resolving files and
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
      currentTranspiler
    ].filter(Boolean)
  })
    .then((bundle) =>
      bundle.write({
        format: format2Rollup[format],
        name,
        banner: targetId === "binary" ? `#!/usr/bin/env node\n\n${banner}` : banner,
        sourcemap: command.flags.sourcemap,
        file: outputFile
      })
    )
    .then(() => variantCallback(null))
    .catch((error) => {
      console.error(error)
      variantCallback(`Error during bundling ${format}: ${error}`)
    })
}
