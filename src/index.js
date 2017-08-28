import { resolve, relative, isAbsolute, dirname } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"
import fileExists from "file-exists"
import meow from "meow"
import chalk from "chalk"
import { get as getRoot } from "app-root-dir"

import { rollup } from "rollup"
import rebase from "rollup-plugin-rebase"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import yamlPlugin from "rollup-plugin-yaml"
import replacePlugin from "rollup-plugin-replace"
import executablePlugin from "rollup-plugin-executable"

import getTranspilers from "./getTranspilers"
import getBanner from "./getBanner"

const ROOT = getRoot()
const PKG_CONFIG = require(resolve(ROOT, "package.json"))

var cache

/* eslint-disable no-console */


const command = meow(`
  Usage
    $ prepublish

  Options
    --input-node       Input file for NodeJS target [default = auto]
    --input-web        Input file for Browser target [default = auto]
    --input-binary     Input file for Binary target [default = auto]

    --output-folder    Configure the output folder [default = auto]

    -t, --transpiler   Chose the transpiler to use. Either "babel" or "buble". [default = babel]
    -x, --minified     Enabled minification of output files
    -m, --sourcemap    Create a source map file during processing
    --target-unstable  Binaries should target the upcoming major version of NodeJS instead of LTS

    -v, --verbose      Verbose output mode [default = false]
    -q, --quiet        Quiet output mode [default = false]
`, {
    default: {
      inputNode: null,
      inputWeb: null,
      inputBinary: null,

      outputFolder: null,

      transpiler: "babel",
      minified: false,
      sourcemap: true,
      targetUnstable: false,

      verbose: false,
      quiet: false
    },

    alias: {
      t: "transpiler",
      x: "minified",
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

// Handle special case to generate a binary file based on config in package.json
const binaryConfig = PKG_CONFIG.bin
let binaryOutput = null
if (binaryConfig) {
  for (let name in binaryConfig) {
    binaryOutput = binaryConfig[name]
    break
  }
}

/* eslint-disable dot-notation */
const outputFileMatrix = {
  // NodeJS Classic Target
  "node-classic-commonjs": PKG_CONFIG["main"] || null,
  "node-classic-esmodule": PKG_CONFIG["module"] || PKG_CONFIG["jsnext:main"] || null,

  // NodeJS ES2015 Target
  "node-es2015-commonjs": PKG_CONFIG["main:es2015"] || null,
  "node-es2015-esmodule": PKG_CONFIG["es2015"] || PKG_CONFIG["module:es2015"] || null,

  // NodeJS Modern Target
  "node-modern-commonjs": PKG_CONFIG["main:modern"] || null,
  "node-modern-esmodule": PKG_CONFIG["module:modern"] || null,

  // Browser Classic Target
  "web-classic-esmodule": PKG_CONFIG["web"] || PKG_CONFIG["browser"] || null,

  // Browser ES2015 Target
  "web-es2015-esmodule": PKG_CONFIG["web:es2015"] || PKG_CONFIG["browser:es2015"] || null,

  // Browser Modern Target
  "web-modern-esmodule": PKG_CONFIG["web:modern"] || PKG_CONFIG["browser:modern"] || null,

  // Binary Target
  "binary-binary-commonjs": binaryOutput || null
}

const outputFolder = command.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["node-classic-commonjs"] = `${outputFolder}/node.classic.commonjs.js`
  outputFileMatrix["node-classic-esmodule"] = `${outputFolder}/node.classic.esmodule.js`

  outputFileMatrix["node-es2015-commonjs"] = `${outputFolder}/node.es2015.commonjs.js`
  outputFileMatrix["node-es2015-esmodule"] = `${outputFolder}/node.es2015.esmodule.js`

  outputFileMatrix["node-modern-commonjs"] = `${outputFolder}/node.modern.commonjs.js`
  outputFileMatrix["node-modern-esmodule"] = `${outputFolder}/node.modern.esmodule.js`

  outputFileMatrix["web-classic-esmodule"] = `${outputFolder}/web.classic.esmodule.js`
  outputFileMatrix["web-es2015-esmodule"] = `${outputFolder}/web.es2015.esmodule.js`
  outputFileMatrix["web-modern-esmodule"] = `${outputFolder}/web.modern.esmodule.js`
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
  targets.node = [
    "src/node/public.js",
    "src/node/export.js",
    "src/node.js",

    "src/server/public.js",
    "src/server/export.js",
    "src/server.js",

    "src/server.js",
    "src/public.js",
    "src/export.js",
    "src/index.js"
  ]
}

if (command.flags.inputWeb) {
  targets.web = [ command.flags.inputWeb ]
} else {
  targets.web = [
    "src/web/public.js",
    "src/web/export.js",
    "src/web.js",

    "src/browser/public.js",
    "src/browser/export.js",
    "src/browser.js",

    "src/client/public.js",
    "src/client/export.js",
    "src/client.js"
  ]
}

if (command.flags.inputBinary) {
  targets.binary = [ command.flags.inputBinary ]
} else {
  targets.binary = [
    "src/binary.js",
    "src/script.js"
  ]
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
        const transpilers = getTranspilers(command.flags.transpiler, {
          minified: command.flags.minified,
          presets: [],
          plugins: [],
          targetUnstable
        })

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

  var fileRebase = rebase({ outputFolder: dirname(outputFile), input, verbose })
  return rollup({
    input,
    cache,
    onwarn: (error) => {
      console.warn(chalk.red("  - " + error.message))
    },
    external(dependency)
    {
      console.log("DEP:",dependency)
      return []
      console.log("XXX:", arguments)
      if (dependency === input) {
        //return false
      }

      if (fileRebase.isExternal(dependency)) {
        return true
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
      currentTranspiler,
      fileRebase,
      transpilerId === "binary" ? executablePlugin() : null
    ].filter(Boolean)
  })
    .then((bundle) =>
      bundle.write({
        format: format2Rollup[format],
        name,
        banner: transpilerId === "binary" ? `#!/usr/bin/env node\n\n${banner}` : banner,
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
