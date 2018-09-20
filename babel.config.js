/* eslint-disable import/no-commonjs */
module.exports = (api) => {
  const env = api.env()
  const caller = api.caller((inst) => (inst && inst.name) || "any")
  api.cache(() => env + "::" + caller)

  console.log(">>> Babel Env:", env, "Caller:", caller)
  console.log(">>> Modules:", env === "test" || caller === "@babel/node" ? "commonjs" : false)

  return {
    "comments": false,
    "sourceMaps": true,
    "plugins": [
      "module:fast-async",
      [
        "@babel/proposal-class-properties",
        {
          "loose": true
        }
      ],
      [
        "@babel/proposal-object-rest-spread",
        {
          "useBuiltIns": true,
          "loose": true
        }
      ],
      [
        "@babel/plugin-transform-runtime",
        {
          "helpers": true,
          "regenerator": false
        }
      ]
    ],
    "presets": [
      [
        "@babel/env",
        {
          "exclude": [
            "transform-regenerator",
            "transform-async-to-generator"
          ],
          "useBuiltIns": "usage",
          "loose": true,
          "modules": env === "test" || caller === "@babel/node" ? "commonjs" : false
        }
      ],
      [
        "@babel/typescript",
        {
          // We like JSX everywhere. No reason why we have to deal with
          // legacy type assertion supported in earlier versions.
          "allExtensions": true,
          "isTSX": true
        }
      ]
    ]
  }
}
