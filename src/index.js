import { resolve, relative, isAbsolute } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"
import fileExists from "file-exists"

import { rollup } from "rollup"
import relink from "rollup-plugin-relink"
import nodeResolve from "rollup-plugin-node-resolve"
import jsonPlugin from "rollup-plugin-json"
import yamlPlugin from "rollup-plugin-yaml"

import getTranspilers from "./getTranspilers"
import getBanner from "./getBanner"

const CWD = process.cwd()
const PKG = require(resolve(CWD, "package.json"))

var cache

const outputFolder = process.argv[3]
const verbose = false

/* eslint-disable dot-notation */
const outputFileMatrix = {
  "node-classic-commonjs": PKG["main"] || null,
  "node-classic-esmodule": PKG["module"] || PKG["jsnext:main"] || null,
  "node-modern-commonjs": PKG["main:modern"] || null,
  "node-modern-esmodule": PKG["module:modern"] || null,
  "browser-classic-esmodule": PKG["browser"] || PKG["web"] || PKG["browserify"] || null,
  "browser-modern-esmodule": PKG["browser:modern"] || PKG["web:modern"] || PKG["browserify:modern"] || null
}

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
const envs = {
  node: [ "src/index.js", "module/index.js", "src/server/index.js" ],
  browser: [ "src/browser/index.js", "src/client/index.js", "src/browser.js", "src/client.js", "src/web.js" ]
}
const formats = [ "esmodule", "commonjs" ]
const transpilers = getTranspilers("react")

eachOfSeries(envs, (envEntries, envId, envCallback) =>
{
  var entry = lookupBest(envEntries)
  console.log("Valid entry: ", entry)
  eachOfSeries(formats, (format, formatIndex, formatCallback) =>
  {
    eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
    {
      var destFile = outputFileMatrix[`${envId}-${transpilerId}-${format}`]
      if (destFile) {
        return bundleTo({ entry, transpilerId, currentTranspiler, format, destFile, variantCallback })
      } else {
        return variantCallback(null)
      }
    }, formatCallback)
  })
})

function lookupBest(candidates) {
  var filtered = candidates.filter(fileExists)
  return filtered[0]
}

function bundleTo({ entry, transpilerId, currentTranspiler, format, destFile, variantCallback }) {
  console.log(`Bundling ${PKG.name} v${PKG.version} as ${transpilerId} defined as ${format} to ${destFile}...`)
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
        sourceMap: true,
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
