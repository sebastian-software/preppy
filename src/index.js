import { resolve, relative, isAbsolute, dirname } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"
import fileExists from "file-exists"
import meow from "meow"
import chalk from "chalk"

import { rollup } from "rollup"
import relink from "rollup-plugin-relink"
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
    --entry-node      Entry file for NodeJS environment [default = auto]
    --entry-browser   Entry file for Browser environment [default = auto]

    --output-folder   Configure the output folder [default = auto]

    -t, --transpiler  Chose the transpiler/config to use. Either "react", "latest" or "buble". [default = latest]
    -x, --minified    Enabled minification of output files
    -m, --sourcemap   Create a source map file during processing

    -v, --verbose     Verbose output mode [default = false]
    -q, --quiet       Quiet output mode [default = false]
`, {
  default: {
    entryNode: null,
    entryBrowser: null,

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
  console.log(cli.flags)
}


/* eslint-disable dot-notation */
const outputFileMatrix = {
  "node-classic-commonjs": PKG["main"] || null,
  "node-classic-esmodule": PKG["module"] || PKG["jsnext:main"] || null,
  "node-modern-commonjs": PKG["main:modern"] || null,
  "node-modern-esmodule": PKG["module:modern"] || null,
  "browser-classic-esmodule": PKG["browser"] || PKG["web"] || PKG["browserify"] || null,
  "browser-modern-esmodule": PKG["browser:modern"] || PKG["web:modern"] || PKG["browserify:modern"] || null
}

const outputFolder = cli.flags.outputFolder
if (outputFolder) {
  outputFileMatrix["node-classic-commonjs"] = `${outputFolder}/node.classic.commonjs.js`
  outputFileMatrix["node-classic-esmodule"] = `${outputFolder}/node.classic.esmodule.js`
  outputFileMatrix["node-modern-commonjs"] = `${outputFolder}/node.modern.commonjs.js`
  outputFileMatrix["node-modern-esmodule"] = `${outputFolder}/node.modern.esmodule.js`
  outputFileMatrix["browser-classic-esmodule"] = `${outputFolder}/browser.classic.esmodule.js`
  outputFileMatrix["browser-modern-esmodule"] = `${outputFolder}/browser.modern.esmodule.js`
}

// Rollups support these formats: 'amd', 'cjs', 'es', 'iife', 'umd'
const format2Rollup = {
  commonjs: "cjs",
  esmodule: "es"
}

const moduleId = PKG.name
const moduleName = camelCase(moduleId)
const banner = getBanner(PKG)
const envs = {}
const formats = [ "esmodule", "commonjs" ]
const transpilers = getTranspilers("react", {
  minified: cli.flags.minified
})

if (cli.flags.entryNode) {
  envs.node = [ cli.flags.entryNode ]
} else {
  envs.node = [ "src/index.js", "module/index.js", "src/server/index.js" ]
}

if (cli.flags.entryBrowser) {
  envs.browser = [ cli.flags.entryBrowser ]
} else {
  envs.browser = [ "src/browser/index.js", "src/client/index.js", "src/browser.js", "src/client.js", "src/web.js" ]
}

eachOfSeries(envs, (envEntries, envId, envCallback) =>
{
  var entry = lookupBest(envEntries)
  if (entry)
  {
    if (!quiet) {
      console.log(`Using entry ${chalk.blue(entry)} for environment ${chalk.blue(envId)}`)
    }

    eachOfSeries(formats, (format, formatIndex, formatCallback) =>
    {
      eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
      {
        var destFile = outputFileMatrix[`${envId}-${transpilerId}-${format}`]
        if (destFile) {
          return bundleTo({ entry, envId, transpilerId, currentTranspiler, format, destFile, variantCallback })
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

function bundleTo({ entry, envId, transpilerId, currentTranspiler, format, destFile, variantCallback }) {
  if (!quiet) {
    console.log(`${chalk.green(">>> Bundling")} ${chalk.magenta(PKG.name)}-${chalk.magenta(PKG.version)} as ${chalk.blue(transpilerId)} defined as ${chalk.blue(format)} to ${chalk.green(destFile)}...`)
  }

  var prefix = "process.env."
  var variables = {
    [`${prefix}NAME`]: JSON.stringify(PKG.name),
    [`${prefix}VERSION`]: JSON.stringify(PKG.version),
    [`${prefix}TARGET`]: JSON.stringify(envId)
  }

  var outputFolder = dirname(destFile)
  var fileRelink = relink({ outputFolder, entry, verbose })
  rollup({
    entry,
    cache,
    onwarn: (msg) => console.warn(msg),
    external(dependency)
    {
      if (dependency === entry) {
        return false
      }

      if (fileRelink.isExternal(dependency)) {
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
      fileRelink
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
