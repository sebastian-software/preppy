import babel from "rollup-plugin-babel"
import json from "rollup-plugin-json"
import executable from "rollup-plugin-executable"
import builtinModules from "builtin-modules"
import pkg from "./package.json"

export default {
  input: "src/index.js",
  output: {
    file: "bin/simplepublish",
    format: "cjs",
    sourcemap: true
  },
  external: Object.keys(pkg.dependencies).concat(builtinModules),
  banner: "#!/usr/bin/env node\n",
  plugins: [
    json(),
    babel(),
    executable()
  ]
}
