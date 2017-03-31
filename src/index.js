import { resolve, relative, isAbsolute, dirname } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"
import fileExists from "file-exists"
import meow from "meow"
import chalk from "chalk"

import { rollup } from "rollup"
import rebase from "rollup-plugin-rebase"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import jsonPlugin from "rollup-plugin-json"
import yamlPlugin from "rollup-plugin-yaml"
import replacePlugin from "rollup-plugin-replace"

import getTranspilers from "./getTranspilers"
import getBanner from "./getBanner"

const CWD = process.cwd()
const PKG_CONFIG = require(resolve(CWD, "package.json"))

var cache

/* eslint-disable no-console */


const command = meow(`
  Usage
    $ prepublish

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


const verbose = command.flags.verbose
const quiet = command.flags.quiet

if (verbose) {
  console.log("Flags:", command.flags)
}


/* eslint-disable dot-notation */
const outputFileMatrix = {
  "node-es2015-esmodule": PKG_CONFIG["es2015"] || null,
  "node-classic-commonjs": PKG_CONFIG["main"] || null,
  "node-classic-esmodule": PKG_CONFIG["module"] ||
    PKG_CONFIG["jsnext:main"] ||
    null,
  "node-classic-iife": PKG_CONFIG["main:iife"] ||
    PKG_CONFIG["main:bundle"] ||
    null,
  "node-modern-commonjs": PKG_CONFIG["main:modern"] || null,
  "node-modern-esmodule": PKG_CONFIG["module:modern"] || null,
  "node-modern-iife": PKG_CONFIG["main:modern:iife"] ||
    PKG_CONFIG["main:modern:bundle"] ||
    null,
  "web-classic-esmodule": PKG_CONFIG["web"] ||
    PKG_CONFIG["browser"] ||
    PKG_CONFIG["browserify"] ||
    null,
  "web-modern-esmodule": PKG_CONFIG["web:modern"] ||
    PKG_CONFIG["browser:modern"] ||
    PKG_CONFIG["browserify:modern"] ||
    null
}

const outputFolder = command.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["node-es2015-esmodule"] = `${outputFolder}/node.es2015.esmodule.js`
  outputFileMatrix["node-classic-commonjs"] = `${outputFolder}/node.classic.commonjs.js`
  outputFileMatrix["node-classic-esmodule"] = `${outputFolder}/node.classic.esmodule.js`
  outputFileMatrix["node-classic-iife"] = `${outputFolder}/node.classic.iife.js`
  outputFileMatrix["node-modern-commonjs"] = `${outputFolder}/node.modern.commonjs.js`
  outputFileMatrix["node-modern-esmodule"] = `${outputFolder}/node.modern.esmodule.js`
  outputFileMatrix["node-modern-iife"] = `${outputFolder}/node.modern.iife.js`
  outputFileMatrix["web-classic-esmodule"] = `${outputFolder}/web.classic.esmodule.js`
  outputFileMatrix["web-modern-esmodule"] = `${outputFolder}/web.modern.esmodule.js`
}

// Rollups support these formats: 'amd', 'cjs', 'es', 'iife', 'umd'
const format2Rollup = {
  commonjs: "cjs",
  esmodule: "es",
  iife: "iife"
}

const moduleId = PKG_CONFIG.name
const moduleName = PKG_CONFIG.moduleName || camelCase(moduleId)
const banner = getBanner(PKG_CONFIG)
const targets = {}
const formats = [ "esmodule", "commonjs", "iife" ]

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
          minified: command.flags.minified,
          runtime: format !== "iife"
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
    onwarn: (message) => console.warn(message),
    external(dependency)
    {
      if (dependency === entry) {
        return false
      }

      if (fileRebase.isExternal(dependency)) {
        return true
      }

      // Inline all external features when building for IIFE
      // There is no `require` or `import` available in that context.
      if (format === "iife") {
        return false
      }

      if (isAbsolute(dependency)) {
        var relativePath = relative(CWD, dependency)
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
      fileRebase
    ]
  })
    .then((bundle) =>
      bundle.write({
        format: format2Rollup[format],
        moduleId,
        moduleName,
        banner,
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
