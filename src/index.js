import { resolve, relative, isAbsolute, dirname } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"
import fileExists from "file-exists"
import meow from "meow"
import chalk from "chalk"

import { rollup } from "rollup"
import rebase from "rollup-plugin-rebase"
import nodeResolve from "rollup-plugin-node-resolve"
import jsonPlugin from "rollup-plugin-json"
import yamlPlugin from "rollup-plugin-yaml"
import replacePlugin from "rollup-plugin-replace"

import getTranspilers from "./getTranspilers"
import getBanner from "./getBanner"

const CWD = process.cwd()
const PKG = require(resolve(CWD, "package.json"))

var cache



const cli = meow(`
  Usage
    $ prepublish-lib

  Options
    --entry-node      Entry file for NodeJS target [default = auto]
    --entry-web       Entry file for Browser target [default = auto]

    --output-folder   Configure the output folder [default = auto]

    -t, --transpiler  Chose the transpiler/config to use. Either "react", "latest" or "buble". [default = latest]
    -x, --minified    Enabled minification of output files
    -m, --sourcemap   Create a source map file during processing

    -v, --verbose     Verbose output mode [default = false]
    -q, --quiet       Quiet output mode [default = false]
`, {
  default: {
    entryNode: null,
    entryWeb: null,

    outputFolder: null,

    transpiler: "react",
    minified: false,
    sourcemap: true,

    verbose: false,
    quiet: false
  }
})


const verbose = cli.flags.verbose
const quiet = cli.flags.quiet

if (verbose) {
  console.log("Flags:", cli.flags)
}


/* eslint-disable dot-notation */
const outputFileMatrix = {
  "node-classic-commonjs": PKG["main"] || null,
  "node-classic-esmodule": PKG["module"] || PKG["jsnext:main"] || null,
  "node-modern-commonjs": PKG["main:modern"] || null,
  "node-modern-esmodule": PKG["module:modern"] || null,
  "web-classic-esmodule": PKG["web"] || PKG["browser"] || PKG["browserify"] || null,
  "web-modern-esmodule": PKG["web:modern"] || PKG["browser:modern"] || PKG["browserify:modern"] || null
}

const outputFolder = cli.flags.outputFolder
if (outputFolder) {
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

const moduleId = PKG.name
const moduleName = camelCase(moduleId)
const banner = getBanner(PKG)
const targets = {}
const formats = [ "esmodule", "commonjs" ]
const transpilers = getTranspilers("react", {
  minified: cli.flags.minified
})

if (cli.flags.entryNode) {
  targets.node = [ cli.flags.entryNode ]
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

if (cli.flags.entryWeb) {
  targets.web = [ cli.flags.entryWeb ]
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

function lookupBest(candidates) {
  var filtered = candidates.filter(fileExists)
  return filtered[0]
}

function bundleTo({ entry, targetId, transpilerId, currentTranspiler, format, destFile, variantCallback }) {
  if (!quiet) {
    console.log(`${chalk.green(">>> Bundling")} ${chalk.magenta(PKG.name)}-${chalk.magenta(PKG.version)} as ${chalk.blue(transpilerId)} defined as ${chalk.blue(format)} to ${chalk.green(destFile)}...`)
  }

  var prefix = "process.env."
  var variables = {
    [`${prefix}NAME`]: JSON.stringify(PKG.name),
    [`${prefix}VERSION`]: JSON.stringify(PKG.version),
    [`${prefix}TARGET`]: JSON.stringify(targetId)
  }

  var fileRebase = rebase({ outputFolder: dirname(destFile), entry, verbose })
  rollup({
    entry,
    cache,
    onwarn: (msg) => console.warn(msg),
    external(dependency)
    {
      if (dependency === entry) {
        return false
      }

      if (fileRebase.isExternal(dependency)) {
        return true
      }

      if (isAbsolute(dependency)) {
        var rel = relative(CWD, dependency)
        return Boolean(/node_modules/.exec(rel))
      }

      return dependency.charAt(0) !== "."
    },
    plugins:
    [
      nodeResolve({
        extensions: [ ".js", ".jsx", ".ts", ".tsx", ".json" ],
        jsnext: true,
        module: true,
        main: true
      }),
      jsonPlugin,
      yamlPlugin,
      replacePlugin(variables),
      currentTranspiler,
      fileRebase
    ]
  })
    .then((bundle) =>
      bundle.write({
        format: format2Rollup[format],
        moduleId,
        moduleName,
        banner,
        sourceMap: cli.flags.sourcemap,
        dest: destFile
      })
    )
    .then(() =>
      variantCallback(null)
    )
    .catch((err) =>
    {
      console.error(err)
      variantCallback(`Error during bundling ${format}: ${err}`)
    })
}
