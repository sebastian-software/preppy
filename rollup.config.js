import babel from "rollup-plugin-babel"
import json from "rollup-plugin-json"
import executable from "rollup-plugin-executable"
import builtinModules from "builtin-modules"

var pkg = require('./package.json')
var external = Object.keys(pkg.dependencies).concat(builtinModules)

export default {
  input: "src/index.js",
  output: {
    file: "bin/simplepublish",
    format: "cjs",
    sourcemap: true
  },
  external,
  banner: "#!/usr/bin/env node\n",
  plugins: [
    json(),
    babel({
    }),
    executable()
  ]
}
