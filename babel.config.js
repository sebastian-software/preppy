/* eslint-disable import/no-commonjs */
module.exports = (api) => {
  const env = api.env()
  const caller = api.caller((inst) => (inst && inst.name) || "any")

  const isBundler = caller === "@rollup/plugin-babel"
  const isCli = caller === "@babel/node"
  const isTest = (/\b(test)\b/).exec(env)
  const modules = (isTest && !isBundler) || isCli ? "commonjs" : false
  const isUmd = (/\b(umd)\b/).exec(env)

  // console.log(`>>> Babel: Env="${env}" Caller="${caller}" Modules="${modules}"`)

  return {
    sourceMaps: true,
    plugins: [
      [
        "@babel/proposal-object-rest-spread",
        {
          useBuiltIns: true,
          loose: true
        }
      ],
      [
        "babel-plugin-lodash",
        {
          id: [ "lodash" ]
        }
      ],
      [
        "@babel/transform-runtime",
        {
          helpers: true,
          regenerator: false
        }
      ]
    ].filter(Boolean),
    presets: [
      [
        "@babel/env",
        {
          exclude: [ "transform-regenerator", "transform-async-to-generator" ],
          useBuiltIns: "usage",
          corejs: 3,
          targets: {
            node: 10
          },
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
