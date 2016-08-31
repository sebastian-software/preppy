import babel from "rollup-plugin-babel"

export default babel(
  {
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    // Allow usage of transform-runtime for referencing to a common library of polyfills
    runtimeHelpers: true,

    exclude: "node_modules/**",

    presets:
    [
      [
        "es2015",
        {
          modules: false,
          loose: true
        }
      ],

      "es2016",
      "es2017",

      // Add Polyfills for Promise, Set, Map, etc. as needed
      "transform-runtime"
    ]
  })
