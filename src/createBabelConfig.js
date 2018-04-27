import babel from "rollup-plugin-babel"

export default function createBabelConfig() {
  return {
    classic: babel({
      // Rollup Setting: Prefer usage of a common library of helpers
      runtimeHelpers: true,

      // Do not transpile external code
      // https://github.com/rollup/rollup-plugin-babel/issues/48#issuecomment-211025960
      exclude: [ "node_modules/**", "**/*.json" ]
    })
  }
}
