import { resolve, relative, isAbsolute } from "path"

import { rollup } from "rollup"
import relink from "rollup-plugin-relink"
import nodeResolve from "rollup-plugin-node-resolve"
import builtinModules from "builtin-modules"

import { eachOfSeries } from "async"
import { camelCase } from "lodash"

import es2015 from "./config/es2015"
import latest from "./config/latest"
import react from "./config/react"

import latestModern from "./config/latest-modern"
import reactModern from "./config/react-modern"

const pkg = require(resolve(process.cwd(), "package.json"))
const external = [].concat(
  Object.keys(pkg.dependencies || {}),
  Object.keys(pkg.devDependencies || {}),
  Object.keys(pkg.peerDependencies || {}),
  builtinModules
)
const externalsMap = {}
for (var i = 0, l = external.length; i < l; i++) {
  externalsMap[external[i]] = true
}

const extensions = [ ".js", ".jsx", ".json" ]

// We try to benefit from native features when possible and offer
// additional builds containing es2015 code for modern clients (Node v6, Chrome 50+, etc.)
// For bundling you have to use a tool which is aware of the additional package entries
// to access the additional exported library files though e.g. via 'main' fields in Webpack v2.
const transpilerConfig = {
  es2015: { es5: es2015 },
  latest: { es5: latest, es2015: latestModern },
  react: { es5: react, es2015: reactModern }
}

var cache

var entry = process.argv[2] || "./src/index.js"
var banner = `/*! ${pkg.name} v${pkg.version}`

if (pkg.author) {
  banner += ` by ${pkg.author.name}`
}

banner += ` */`

var formats = [ "esmodule", "commonjs" ]

var moduleId = pkg.name
var moduleName = camelCase(pkg.name)
var verbose = false

/* eslint-disable id-length */
const outputFileMatrix = {
  "es5-commonjs": pkg.main || null,
  "es5-esmodule": pkg.module || pkg["jsnext:main"] || null,
  "es2015-commonjs": pkg["main:es2015"] || null,
  "es2015-esmodule": pkg["module:es2015"] || null
}

const outputFolder = process.argv[3]
if (outputFolder) {
  outputFileMatrix["es5-commonjs"] = `${outputFolder}/index.es5.commonjs.js`
  outputFileMatrix["es5-esmodule"] = `${outputFolder}/index.es5.esmodule.js`
  outputFileMatrix["es2015-commonjs"] = `${outputFolder}/index.es2015.commonjs.js`
  outputFileMatrix["es2015-esmodule"] = `${outputFolder}/index.es2015.esmodule.js`
}

// Rollups support these formats: 'amd', 'cjs', 'es', 'iife', 'umd'
const prepublishToRollup = {
  commonjs: "cjs",
  esmodule: "es"
}

var transpilationMode = "react"

eachOfSeries(formats, (format, formatIndex, formatCallback) =>
{
  var transpilers = transpilerConfig[transpilationMode]
  eachOfSeries(transpilers, (currentTranspiler, transpilerId, variantCallback) =>
  {
    console.log(`Bundling ${pkg.name} v${pkg.version} as ${transpilerId} defined as ${format}...`)
    var fileRelink = relink({ outputFolder, entry, verbose })
    var destFile = outputFileMatrix[`${transpilerId}-${format}`]
    if (!destFile) {
      return variantCallback(null)
    }

    rollup({
      entry: entry,
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
          var rel = relative(process.cwd(), dependency)
          return Boolean(/node_modules/.exec(rel))
        }

        return dependency.charAt(0) !== "."
      },
      plugins:
      [
        nodeResolve({ extensions, jsnext: true, module: true, main: true }),
        currentTranspiler,
        fileRelink
      ]
    }).then((bundle) =>
        bundle.write({
          format: prepublishToRollup[format],
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
