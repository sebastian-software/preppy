# *Prepublish* <br/>[![Sponsored by][sponsor-img]][sponsor] [![Version][npm-version-img]][npm] [![Downloads][npm-downloads-img]][npm] [![Build Status Unix][travis-img]][travis] [![Build Status Windows][appveyor-img]][appveyor] [![Dependencies][deps-img]][deps]

*Prepublish* is a solution for simplifying pre-publishing typical JavaScript projects for publishing to NPM.

[sponsor-img]: https://img.shields.io/badge/Sponsored%20by-Sebastian%20Software-692446.svg
[sponsor]: https://www.sebastian-software.de
[deps]: https://david-dm.org/sebastian-software/prepublish
[deps-img]: https://david-dm.org/sebastian-software/prepublish.svg
[npm]: https://www.npmjs.com/package/prepublish
[npm-downloads-img]: https://img.shields.io/npm/dm/prepublish.svg
[npm-version-img]: https://img.shields.io/npm/v/prepublish.svg
[travis-img]: https://img.shields.io/travis/sebastian-software/prepublish/master.svg?branch=master&label=unix%20build
[appveyor-img]: https://img.shields.io/appveyor/ci/swernerx/prepublish/master.svg?label=windows%20build
[travis]: https://travis-ci.org/sebastian-software/prepublish
[appveyor]: https://ci.appveyor.com/project/swernerx/prepublish/branch/master


## Transpilers

*Prepublish* includes two transpiler configurations:

- **[Buble](https://buble.surge.sh/guide/)**: Blazing fast ES2015+ transpiler where the goal is to have lightweight runtime code, too.
- **[Babel](https://babeljs.io/docs/plugins/preset-latest/)**: Configuration of Babel transpiler. Supports all of ES2015/ES2016/ES2017. Plus some ES3 helpers for maximum engine compatibility. Plus Support for [Object-Rest-Spread](https://babeljs.io/docs/plugins/transform-object-rest-spread/) and [Class Properties](https://babeljs.io/docs/plugins/transform-class-properties/). The High-performance async engine with support for generators and async/await powered by [fast-async](https://github.com/MatAtBread/fast-async) is enabled by default. It requires [nodent-runtime](https://github.com/MatAtBread/nodent-runtime). Uses [Transform-Runtime](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime) to externalize requirements to Polyfills. Resulting code needs all Polyfills for each library published with this tool. Typically by using services like [polyfill.io](https://qa.polyfill.io/v2/docs/) or [Babel Runtime](https://github.com/babel/babel/tree/master/packages/babel-runtime) aka [CoreJS](https://github.com/zloirock/core-js).


## Output Targets

*Prepublish* produces exports of your sources depending on the entries of your packages `package.json`. It supports
building for *CommonJS* and well as with ES Modules (ESM). Just add the relevant entries to
the configuration.

- CommonJS Output: `main`
- ES Module Output: `module`

Basic Example:

```json
{
  "name": "mypackage",
  "main": "lib/main-cjs.js",
  "module": "lib/main-esm.js"
}
```

To offer separate NodeJS and Browser builds use one of the following keys for the browser bundle: `browser` or `web`. These bundles are always exported as ES Modules (ESM) as we have the assumption that they are bundled by another tool like Webpack or Rollup before usage.

Example:

```json
{
  "name": "mypackage",
  "main": "lib/main-cjs.js",
  "module": "lib/main-esm.js",
  "browser": "lib/main-browser.js"
}
```


## Input Entries

You might wonder how to produce a browser bundle from a different input. This is actually pretty easy. Your package just have to follow this convention.

The files are looked up for an order. The first match is being used.

### Entries for NodeJS targets

- `src/node/public.js`
- `src/node/export.js`
- `src/node.js`
- `src/server/public.js`
- `src/server/export.js`
- `src/server.js`
- `src/server.js`
- `src/public.js`
- `src/export.js`
- `src/index.js`

### Sources for the Browser targets

- `src/web/public.js`
- `src/web/export.js`
- `src/web.js`
- `src/browser/public.js`
- `src/browser/export.js`
- `src/browser.js`
- `src/client/public.js`
- `src/client/export.js`
- `src/client.js`

### Sources for binary targets

- `src/binary.js`
- `src/script.js`


## Targetting ES2015

You are able to export modules for either ES5 compatible environments or for more modern platforms, too.

Note: To use these non-standard bundle outputs requires some tweaks on the bundling phase of the application, too (e.g. in Webpack). This is because we are using non-standardized configuration keys in package.json. Typically just append either `:es2015` or `:modern` to your normal targets:

- CommonJS Output for NodeJS with ES2015 kept intact: `main:es2015`
- ES Modules Output for NodeJS with ES2015 kept intact: `module:es2015`
- Browser Output as ES Modules with ES2015 kept intact: `browser:es2015`

While `es2015` is exactly a requirement for the client to have full ES2015 support, `modern` is even more modern adding things from ES2017 to the list like `async`/`await`. Modern is regularly updated inside our [Babel Preset](https://github.com/sebastian-software/babel-preset-edge). It is by no way a never changing stable target.

Example Configuration:

```json
{
  "name": "mypackage",
  "main": "lib/main-cjs.js",
  "module": "lib/main-esm.js",
  "browser": "lib/main-browser.js",
  "main:es2015": "lib/main-cjs-es2015.js",
  "module:es2015": "lib/main-esm-es2015.js",
  "browser:es2015": "lib/main-browser-es2015.js"
}
```

To make sense of all these new modules it would help to produce two different outputs. One for classic browsers and one for modern browsers. ES2015 enabled features are [rapidly catching up in performance](https://kpdecker.github.io/six-speed/). Some features are pretty hard to rework for older browsers like Generators, Async/Await, or even Block Scope. Therefor we think there is no need for sending ES2015-capable clients the fully transpiled code down the wire. Keep in mind that you have to implement some basic client detection to send one or the other file to the matching client.

BTW: The modern builds [make a lot of sense during development](https://medium.com/@gajus/dont-use-babel-transpilers-when-debugging-an-application-890ee528a5b3) as it results in shorter transpiler runtimes.


## Binary Output

Additionally `prepublish` is capable in generating for binary targets.

This generates a `mypackage` binary which is generated from the matching source file.

Binaries are generally generated from one of these source files:

- `src/binary.js`
- `src/script.js`

Example Configuration:

```json
{
  "name": "mypackage",
  "bin": {
    "mypackage": "bin/mypackage"
  }
}
```

### NodeJS v8 Binaries

There is a new option to explicitely target Node v8 when generating binaries. This is controlled via a new command line argument:

Use `prepublish --target-unstable` together with the "bin" entry seen before.



## Related Content

- [Setting up multi-platform npm packages](http://2ality.com/2017/04/setting-up-multi-platform-packages.html)



## Installation

### NPM

```console
$ npm install --save-dev prepublish
```

### Yarn

```console
$ yarn add --dev prepublish
```



## Usage

*Prepublish* comes with a binary which can be called from within your `scripts` section
in the `package.json` file.

```json
"scripts": {
  "prepare": "prepublish"
}
```

There is also some amount of parameters you can use if the auto detection of your library does not work out correctly.

```
Usage
  $ prepublish

Options
  --entry-node       Entry file for NodeJS target [default = auto]
  --entry-web        Entry file for Browser target [default = auto]
  --entry-binary     Entry file for Binary target [default = auto]

  --output-folder    Configure the output folder [default = auto]

  -t, --transpiler   Chose the transpiler to use. Either "babel" or "buble". [default = babel]
  -x, --minified     Enabled minification of output files
  -m, --sourcemap    Create a source map file during processing
  --target-unstable  Binaries should target the upcoming major version of NodeJS instead of LTS

  -v, --verbose      Verbose output mode [default = false]
  -q, --quiet        Quiet output mode [default = false]
```


## License

[Apache License; Version 2.0, January 2004](http://www.apache.org/licenses/LICENSE-2.0)


## Copyright

<img src="assets/sebastiansoftware.png" alt="Sebastian Software GmbH Logo" width="250" height="200"/>

Copyright 2016-2017<br/>[Sebastian Software GmbH](http://www.sebastian-software.de)
