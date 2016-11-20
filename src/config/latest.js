import babel from "rollup-plugin-babel"

export default babel({
  // Don't try to find .babelrc because we want to force this configuration.
  babelrc: false,

  // Allow usage of transform-runtime for referencing to a common library of polyfills
  runtimeHelpers: true,

  exclude: "node_modules/**",

  presets:
  [
    [ "latest", {
      es2015: {
        modules: false
      }
    } ]
  ],

  plugins: [
    // Improve some ES3 edge case to make code parseable by older clients
    // e.g. when using reserved words as keys like "catch"
    "transform-es3-property-literals",
    "transform-es3-member-expression-literals",

    // Add Polyfills for Promise, Set, Map, etc. as needed
    "transform-runtime",

    // class { handleClick = () => { } }
    "transform-class-properties",

    // { ...todo, completed: true }
    "transform-object-rest-spread",

    // { ...todo, completed: true }
    "transform-object-rest-spread"
  ]
})
