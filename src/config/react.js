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
    }],

    "react"
  ],

  plugins:
  [
    // Improve some ES3 edge case to make code parseable by older clients
    // e.g. when using reserved words as keys like "catch"
    "transform-es3-property-literals",
    "transform-es3-member-expression-literals",

    // Using centralized helpers but require generic Polyfills being loaded separately
    // e.g. via Babel-Runtime or via services like polyfill.io.
    [ "transform-runtime", {
      polyfill: false
    }],

    // class { handleClick = () => { } }
    "transform-class-properties",

    // { ...todo, completed: true }
    [ "transform-object-rest-spread", { useBuiltIns: true }]

    // Optimization: hoist JSX that never changes out of render()
    "transform-react-constant-elements",

    // Optimization: wrap propTypes into environment checks
    "transform-react-remove-prop-types"
  ]
})
