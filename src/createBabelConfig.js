import babel from "rollup-plugin-babel"

export default function createBabelConfig() {
  return {
    classic: babel({
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
}
