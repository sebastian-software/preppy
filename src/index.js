import { resolve } from "path"

import { rollup } from "rollup"
import buble from "rollup-plugin-buble"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"

import readPackage from "read-package-json"
import denodeify from "denodeify"
import { eachSeries } from "async"
import { camelCase } from "lodash"

var readPackageAsync = denodeify(readPackage)
var cache;

readPackageAsync(resolve("package.json")).then(function(pkg)
{
  var entry = "src/index.js"
  var banner = `/*! ${pkg.name} v${pkg.version} by ${pkg.author.name} */`
  var formats = [ "es", "cjs", "umd" ]
  var deepBundle = false

  var moduleId = pkg.name
  var moduleName = camelCase(pkg.name)

  eachSeries(formats, function(format, callback)
  {
    console.log(`Bundling ${pkg.name} v${pkg.version} as ${format}...`)

    rollup({
      entry: entry,
      cache,
      onwarn: function() {},
      plugins: [
        buble(),
        deepBundle ? nodeResolve({ jsnext: true, main: true }) : {},
        commonjs({ include: "node_modules/**" })
      ]
    })
    .then(function (bundle)
    {
      return bundle.write({
        format,
        moduleId,
        moduleName,
        banner,
        sourceMap: true,
        dest: `lib/out.${format}.js`
      })
    })
    .then(function()
    {
      callback(null);
    })
    .catch(function(err) {
      callback(`Error during bundling ${format}: ${err}`)
    })
  })
})
