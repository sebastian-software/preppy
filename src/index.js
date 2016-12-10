import { resolve, relative, isAbsolute } from "path"
import { eachOfSeries } from "async"
import { camelCase } from "lodash"

import { rollup } from "rollup"
import relink from "rollup-plugin-relink"
import nodeResolve from "rollup-plugin-node-resolve"

import getTranspilers from "./getTranspilers"
import getBanner from "./getBanner"

const pkg = require(resolve(process.cwd(), "package.json"))

var cache

const entry = process.argv[2] || "./src/index.js"
const outputFolder = process.argv[3]
const verbose = false

/* eslint-disable dot-notation */
const outputFileMatrix = {
  "classic-commonjs": pkg["main"] || null,
  "classic-esmodule": pkg["module"] || pkg["jsnext:main"] || null,
  "modern-commonjs": pkg["main:es2015"] || null,
  "modern-esmodule": pkg["module:es2015"] || null,
  "browser-classic-esmodule": pkg["browser"] || pkg["web"] || null,
  "browser-modern-esmodule": pkg["browser:es2015"] || pkg["web:es2015"] || null
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

const moduleId = pkg.name
const moduleName = camelCase(moduleId)
const banner = getBanner(pkg)
const CWD = process.cwd()
const formats = [ "esmodule", "commonjs" ]
const transpilers = getTranspilers("react")
eachOfSeries(formats, (format, formatIndex, formatCallback) =>
{
  eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
  {
    var destFile = outputFileMatrix[`${transpilerId}-${format}`]
    if (!destFile) {
      return variantCallback(null)
    }

    console.log(`Bundling ${pkg.name} v${pkg.version} as ${transpilerId} defined as ${format} to ${destFile}...`)
    var fileRelink = relink({ outputFolder, entry, verbose })
    rollup({
      entry,
      cache,
      onwarn: (msg) => console.warn(msg),
      external: function(dependency)
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
        currentTranspiler,
        fileRelink
      ]
    }).then((bundle) =>
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
  }, formatCallback)
})
