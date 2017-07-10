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
    --entry-node      Entry file for NodeJS target [default = auto]
    --entry-web       Entry file for Browser target [default = auto]
    --entry-binary    Entry file for Binary target [default = auto]

    --output-folder   Configure the output folder [default = auto]

    -t, --transpiler  Chose the transpiler to use. Either "babel" or "buble". [default = babel]
    -x, --minified    Enabled minification of output files
    -m, --sourcemap   Create a source map file during processing

    -v, --verbose     Verbose output mode [default = false]
    -q, --quiet       Quiet output mode [default = false]
`, {
    default: {
      entryNode: null,
      entryWeb: null,
      entryBinary: null,

      outputFolder: null,

      transpiler: "babel",
      minified: false,
      sourcemap: true,

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
  "node-es2015-esmodule": PKG_CONFIG["es2015"] || null,
  "node-classic-commonjs": PKG_CONFIG["main"] || null,
  "node-classic-esmodule": PKG_CONFIG["module"] ||
    PKG_CONFIG["jsnext:main"] ||
    null,
  "node-modern-commonjs": PKG_CONFIG["main:modern"] || null,
  "node-modern-esmodule": PKG_CONFIG["module:modern"] || null,
  "web-classic-esmodule": PKG_CONFIG["web"] ||
    PKG_CONFIG["browser"] ||
    PKG_CONFIG["browserify"] ||
    null,
  "web-modern-esmodule": PKG_CONFIG["web:modern"] ||
    PKG_CONFIG["browser:modern"] ||
    PKG_CONFIG["browserify:modern"] ||
    null,
  "binary-binary-commonjs": binaryOutput || null
}

const outputFolder = command.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["node-es2015-esmodule"] = `${outputFolder}/node.es2015.esmodule.js`
  outputFileMatrix["node-classic-commonjs"] = `${outputFolder}/node.classic.commonjs.js`
  outputFileMatrix["node-classic-esmodule"] = `${outputFolder}/node.classic.esmodule.js`
  outputFileMatrix["node-modern-commonjs"] = `${outputFolder}/node.modern.commonjs.js`
  outputFileMatrix["node-modern-esmodule"] = `${outputFolder}/node.modern.esmodule.js`
  outputFileMatrix["web-classic-esmodule"] = `${outputFolder}/web.classic.esmodule.js`
  outputFileMatrix["web-modern-esmodule"] = `${outputFolder}/web.modern.esmodule.js`
}

// Rollups support these formats: 'amd', 'cjs', 'es', 'iife', 'umd'
const format2Rollup = {
  commonjs: "cjs",
  esmodule: "es"
}

const moduleName = PKG_CONFIG.moduleName || camelCase(PKG_CONFIG.name)
const banner = getBanner(PKG_CONFIG)
const targets = {}
const formats = [ "esmodule", "commonjs" ]

if (command.flags.entryNode) {
  targets.node = [ command.flags.entryNode ]
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

if (command.flags.entryWeb) {
  targets.web = [ command.flags.entryWeb ]
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

if (command.flags.entryBinary) {
  targets.binary = [ command.flags.entryBinary ]
} else {
  targets.binary = [
    "src/binary.js",
    "src/script.js"
  ]
}

try {
  eachOfSeries(targets, (envEntries, targetId, envCallback) =>
  {
    var entry = lookupBest(envEntries)
    if (entry)
    {
      if (!quiet) {
        console.log(`Using entry ${chalk.blue(entry)} for target ${chalk.blue(targetId)}`)
      }

      eachOfSeries(formats, (format, formatIndex, formatCallback) =>
      {
        const transpilers = getTranspilers(command.flags.transpiler, {
          minified: command.flags.minified
        })

        eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
        {
          var destFile = outputFileMatrix[`${targetId}-${transpilerId}-${format}`]
          if (destFile) {
            return bundleTo({ entry, targetId, transpilerId, currentTranspiler, format, destFile, variantCallback })
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
  console.error(error)
  process.exit(1)
}

function lookupBest(candidates) {
  var filtered = candidates.filter(fileExists.sync)
  return filtered[0]
}

function bundleTo({ entry, targetId, transpilerId, currentTranspiler, format, destFile, variantCallback }) {
  if (!quiet) {
    /* eslint-disable max-len */
    console.log(`${chalk.green(">>> Bundling")} ${chalk.magenta(PKG_CONFIG.name)}-${chalk.magenta(PKG_CONFIG.version)} as ${chalk.blue(transpilerId)} defined as ${chalk.blue(format)} to ${chalk.green(destFile)}...`)
  }

  var prefix = "process.env."
  var variables = {
    [`${prefix}NAME`]: JSON.stringify(PKG_CONFIG.name),
    [`${prefix}VERSION`]: JSON.stringify(PKG_CONFIG.version),
    [`${prefix}TARGET`]: JSON.stringify(targetId)
  }

  var fileRebase = rebase({ outputFolder: dirname(destFile), entry, verbose })
  return rollup({
    entry,
    cache,
    onwarn: (error) => {
      console.warn(chalk.red("  - " + error.message))
    },
    external(dependency)
    {
      if (dependency === entry) {
        return false
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
      commonjs({
        include: "node_modules/**"
      }),
      jsonPlugin,
      yamlPlugin,
      replacePlugin(variables),
      currentTranspiler,
      fileRebase,
      transpilerId === "binary" ? executablePlugin() : null
    ].filter(Boolean)
  })
    .then((bundle) =>
      bundle.write({
        format: format2Rollup[format],
        moduleName,
        banner: transpilerId === "binary" ? `#!/usr/bin/env node\n\n${banner}` : banner,
        sourceMap: command.flags.sourcemap,
        dest: destFile
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
