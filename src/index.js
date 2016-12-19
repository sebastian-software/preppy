import { resolve, relative, isAbsolute } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"

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

// FIXME for browser... andere Quelle wäre schon sinnvoll!!!
const entry = process.argv[2] || "./src/index.js"
const outputFolder = process.argv[3]
const verbose = false

/* eslint-disable dot-notation */
const outputFileMatrix = {
  "classic-commonjs": PKG["main"] || null,
  "classic-esmodule": PKG["module"] || PKG["jsnext:main"] || null,
  "modern-commonjs": PKG["main:modern"] || null,
  "modern-esmodule": PKG["module:modern"] || null,
  "browser-classic-esmodule": PKG["browser"] || PKG["web"] || PKG["browserify"] || null,
  "browser-modern-esmodule": PKG["browser:modern"] || PKG["web:modern"] || PKG["browserify:modern"] || null
}

if (outputFolder) {
  outputFileMatrix["classic-commonjs"] = `${outputFolder}/node.classic.commonjs.js`
  outputFileMatrix["classic-esmodule"] = `${outputFolder}/node.classic.esmodule.js`
  outputFileMatrix["modern-commonjs"] = `${outputFolder}/node.modern.commonjs.js`
  outputFileMatrix["modern-esmodule"] = `${outputFolder}/node.modern.esmodule.js`
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
const formats = [ "esmodule", "commonjs" ]
const transpilers = getTranspilers("react")
eachOfSeries(formats, (format, formatIndex, formatCallback) =>
{
  eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
  {
    var destFile = outputFileMatrix[`${transpilerId}-${format}`]
    if (destFile) {
      return bundleTo({ transpilerId, currentTranspiler, format, destFile, variantCallback })
    } else {
      return variantCallback(null)
    }
  }, formatCallback)
})


function bundleTo({ transpilerId, currentTranspiler, format, destFile, variantCallback }) {
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
        extensions: [ ".js", ".jsx", ".json" ],
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
