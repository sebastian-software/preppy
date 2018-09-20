/* eslint-disable import/no-commonjs */
module.exports = (api) => {
  const env = api.env()
  const caller = api.caller((inst) => (inst && inst.name) || "any")

  const isBundler = caller === "rollup-plugin-babel"
  const isCli = caller === "@babel/node"
  const modules = (env === "test" && !isBundler) || isCli ? "commonjs" : false

  console.log(`>>> Babel: Env="${env}" Caller="${caller}" Modules="${modules}"`)

  return {
    sourceMaps: true,
    plugins: [
      "module:fast-async",
      [
        "@babel/proposal-class-properties",
        {
          loose: true
        }
      ],
      [
        "@babel/proposal-object-rest-spread",
        {
          useBuiltIns: true,
          loose: true
        }
      ],
      [
        "@babel/transform-runtime",
        {
          helpers: true,
          regenerator: false
        }
      ]
    ],
    presets: [
      [
        "@babel/env",
        {
          exclude: [ "transform-regenerator", "transform-async-to-generator" ],
          useBuiltIns: "usage",
          loose: true,
          modules
        }
      ],
      [
        "@babel/typescript",
        {
          // We like JSX everywhere. No reason why we have to deal with
          // legacy type assertion supported in earlier versions.
          allExtensions: true,
          isTSX: true
        }
      ]
    ]
  }
}
