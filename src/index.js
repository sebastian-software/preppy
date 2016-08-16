import { resolve } from "path"

import { rollup } from "rollup"
import buble from "rollup-plugin-buble"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import uglify from "rollup-plugin-uglify"

import readPackage from "read-package-json"
import denodeify from "denodeify"
import { eachSeries } from "async"
import { camelCase } from "lodash"

var readPackageAsync = denodeify(readPackage)
var cache

readPackageAsync(resolve("package.json")).then((pkg) =>
{
  var entry = "src/index.js"
  var banner = `/*! ${pkg.name} v${pkg.version} by ${pkg.author.name} */`
  var formats = [ "es", "cjs", "umd", "umd-min" ]
  var deepBundle = false

  var moduleId = pkg.name
  var moduleName = camelCase(pkg.name)

  const outputFileMatrix = {
    "cjs": pkg.main || "lib/index.js",
    "es" : pkg.module || pkg["jsnext:main"] || "lib/index.es.js",
    "umd": pkg.browser || "lib/index.umd.js",
    "umd-min": pkg.browser ? pkg.browser.replace(".js", ".min.js") : "lib/index.umd.min.js"
  }

  eachSeries(formats, (format, callback) =>
  {
    console.log(`Bundling ${pkg.name} v${pkg.version} as ${format}...`)

    var fileFormat = format.split("-")[0]
    var fileMode = format.split("-")[1]

    return rollup({
      entry: entry,
      cache,
      onwarn: function() {},
      plugins:
      [
        buble(),
        deepBundle ? nodeResolve({ jsnext: true, main: true }) : null,
        commonjs({ include: "node_modules/**" }),
        fileMode === "min" ? uglify() : null
      ].filter((entry) => entry != null)
    })
    .then((bundle) =>
      bundle.write({
        format: fileFormat,
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
})
