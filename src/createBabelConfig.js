import babel from "rollup-plugin-babel"

/* eslint-disable max-params */
export function createHelper({ mode = "classic", presets = [], plugins = [] }) {
  return babel({
    // Rollup Setting: Allow usage of transform-runtime for referencing to a common library of polyfills
    runtimeHelpers: true,

    // Do not transpile external code
    // https://github.com/rollup/rollup-plugin-babel/issues/48#issuecomment-211025960
    exclude: [
      "node_modules/**",
      "**/*.json"
    ]
  })
}

export default function createBabelConfig(options) {
  return {
    classic: createHelper({ ...options, mode: "classic" }),
    es2015: createHelper({ ...options, mode: "es2015" })
  }
}
