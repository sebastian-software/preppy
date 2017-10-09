import { resolve, relative, isAbsolute } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"
import fileExists from "file-exists"
import meow from "meow"
import chalk from "chalk"
import { get as getRoot } from "app-root-dir"

import { rollup } from "rollup"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import yamlPlugin from "rollup-plugin-yaml"
import replacePlugin from "rollup-plugin-replace"

import createBabelConfig from "./createBabelConfig"
import getBanner from "./getBanner"

const ROOT = getRoot()
const PKG_CONFIG = require(resolve(ROOT, "package.json"))

var cache

/* eslint-disable no-console */

const command = meow(`
  Usage
    $ simplepublish

  Options
    --input            Input file [default = auto]
    --output-folder    Configure the output folder [default = auto]

    -m, --sourcemap    Create a source map file during processing
    -v, --verbose      Verbose output mode [default = false]
    -q, --quiet        Quiet output mode [default = false]
`, {
    default: {
      input: null,
      outputFolder: null,

      sourcemap: true,
      verbose: false,
      quiet: false
    },

    alias: {
      m: "sourcemap",
      v: "verbose",
      q: "quiet"
    }
  }
)


const verbose = command.flags.verbose
const quiet = command.flags.quiet
const targetUnstable = command.flags.targetUnstable

if (verbose) {
  console.log("Flags:", command.flags)
}

/* eslint-disable dot-notation */
const outputFileMatrix = {
  // NodeJS Classic Target
  "node-classic-commonjs": PKG_CONFIG["main"] || null,
  "node-classic-esmodule": PKG_CONFIG["module"] || PKG_CONFIG["jsnext:main"] || null
}

const outputFolder = command.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["node-classic-commonjs"] = `${outputFolder}/node.classic.commonjs.js`
  outputFileMatrix["node-classic-esmodule"] = `${outputFolder}/node.classic.esmodule.js`
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

if (command.flags.input) {
  targets.node = [ command.flags.input ]
} else {
  targets.node = [ "src/index.js" ]
}

/* eslint-disable max-params */
try {
  eachOfSeries(targets, (envInputs, targetId, envCallback) =>
  {
    var input = lookupBest(envInputs)
    if (input)
    {
      if (!quiet) {
        console.log(`Using input ${chalk.blue(input)} for target ${chalk.blue(targetId)}`)
      }

      eachOfSeries(formats, (format, formatIndex, formatCallback) =>
      {
        const transpilers = createBabelConfig()

        eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
        {
          var outputFile = outputFileMatrix[`${targetId}-${transpilerId}-${format}`]
          if (outputFile) {
            return bundleTo({ input, targetId, transpilerId, currentTranspiler, format, outputFile, variantCallback })
          } else {
            return variantCallback(null)
          }
        }, formatCallback)
      }, envCallback)
    }
    else
    {
      envCallback(null)
    }
  })
}
catch (error)
{
  /* eslint-disable no-process-exit */
  console.error(error)
  process.exit(1)
}

function lookupBest(candidates) {
  var filtered = candidates.filter(fileExists.sync)
  return filtered[0]
}

function bundleTo({ input, targetId, transpilerId, currentTranspiler, format, outputFile, variantCallback }) {
  if (!quiet) {
    /* eslint-disable max-len */
    console.log(`${chalk.green(">>> Bundling")} ${chalk.magenta(PKG_CONFIG.name)}-${chalk.magenta(PKG_CONFIG.version)} as ${chalk.blue(transpilerId)} defined as ${chalk.blue(format)} to ${chalk.green(outputFile)}...`)
  }

  var prefix = "process.env."
  var variables = {
    [`${prefix}NAME`]: JSON.stringify(PKG_CONFIG.name),
    [`${prefix}VERSION`]: JSON.stringify(PKG_CONFIG.version),
    [`${prefix}TARGET`]: JSON.stringify(targetId)
  }

  return rollup({
    input,
    cache,
    onwarn: (error) => {
      console.warn(chalk.red("  - " + error.message))
    },
    external(dependency)
    {
      if (dependency == input) {
        return false
      }

      if (isAbsolute(dependency)) {
        var relativePath = relative(ROOT, dependency)
        return Boolean(/node_modules/.exec(relativePath))
      }

      return dependency.charAt(0) !== "."
    },
    plugins:
    [
      nodeResolve({
        extensions: [ ".mjs", ".js", ".jsx", ".ts", ".tsx", ".json" ],
        jsnext: true,
        module: true,
        main: true
      }),
      replacePlugin(variables),
      commonjs({
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
        banner,
        sourcemap: command.flags.sourcemap,
        file: outputFile
      })
    )
    .then(() =>
      variantCallback(null)
    )
    .catch((error) =>
    {
      console.error(error)
      variantCallback(`Error during bundling ${format}: ${error}`)
    })
}
