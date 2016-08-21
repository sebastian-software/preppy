import babel from "rollup-plugin-babel"

export default babel(
  {
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    exclude: "node_modules/**",

    presets:
    [
      [
        "es2015",
        {
          modules: false
        }
      ],

      "es2016",
      "react"
    ],

    plugins:
    [
      // function x(a, b, c,) { }
      "syntax-trailing-function-commas",

      // await fetch()
      "syntax-async-functions",

      // class { handleClick = () => { } }
      "transform-class-properties",

      // { ...todo, completed: true }
      "transform-object-rest-spread",

      // function* () { yield 42; yield 43; }
      "transform-regenerator",

      // Polyfills the runtime needed for async/await and generators
      [
        "transform-runtime",
        {
          helpers: false,
          polyfill: false,
          regenerator: true
        }
      ],

      // Optimization: hoist JSX that never changes out of render()
      "transform-react-constant-elements"
    ]
  })
