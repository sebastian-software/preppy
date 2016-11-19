import { resolve, relative, isAbsolute } from "path"

import { rollup } from "rollup"
import relink from "rollup-plugin-relink"
import nodeResolve from "rollup-plugin-node-resolve"
import builtinModules from "builtin-modules"

import { eachSeries } from "async"
import { camelCase } from "lodash"

import es2015 from "./config/es2015"
import latest from "./config/latest"
import react from "./config/react"

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

const extensions = [ ".js", ".jsx", ".es5", ".es6", ".es", ".json" ]

const transpilerConfig = {
  es2015,
  latest,
  react
}

var cache

var entry = process.argv[2] || "./src/index.js"
var banner = `/*! ${pkg.name} v${pkg.version}`

if (pkg.author) {
  banner += ` by ${pkg.author.name}`
}

banner += ` */`

var formats = [ "es", "cjs" ]

var moduleId = pkg.name
var moduleName = camelCase(pkg.name)
var verbose = true

/* eslint-disable id-length */
const outputFolder = process.argv[3] ? process.argv[3] : "lib"
const outputFileMatrix = {
  cjs: outputFolder ? `${outputFolder}/index.js` : pkg.main || null,
  es: outputFolder ? `${outputFolder}/index.es.js` : pkg.module || pkg["jsnext:main"] || null
}

eachSeries(formats, (format, callback) =>
{
  console.log(`Bundling ${pkg.name} v${pkg.version} as ${format}...`)

  var fileRelink = relink({ outputFolder, entry, verbose })

  var transpilationMode = "react"

  return rollup({
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
      transpilerConfig[transpilationMode],
      fileRelink
    ]
  }).then((bundle) =>
      bundle.write({
        format,
        moduleId,
        moduleName,
        banner,
        sourceMap: true,
        dest: outputFileMatrix[format]
      })
    )
    .then(() =>
      callback(null)
    )
    .catch((err) =>
    {
      console.error(err)
      callback(`Error during bundling ${format}: ${err}`)
    })
})
