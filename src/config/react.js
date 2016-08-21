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
      "babel-plugin-syntax-trailing-function-commas",

      // await fetch()
      "babel-plugin-syntax-async-functions",

      // class { handleClick = () => { } }
      "babel-plugin-transform-class-properties",

      // { ...todo, completed: true }
      "babel-plugin-transform-object-rest-spread",

      // function* () { yield 42; yield 43; }
      "babel-plugin-transform-regenerator",

      // Polyfills the runtime needed for async/await and generators
      [
        "babel-plugin-transform-runtime",
        {
          helpers: false,
          polyfill: false,
          regenerator: true
        }
      ],

      // Optimization: hoist JSX that never changes out of render()
      "babel-plugin-transform-react-constant-elements"
    ]
  })
