# *Preppy* <br/>[![Sponsored by][sponsor-img]][sponsor] [![Version][npm-version-img]][npm] [![Downloads][npm-downloads-img]][npm] [![Build Status Unix][travis-img]][travis] [![Build Status Windows][appveyor-img]][appveyor] [![Code Coverage][codecov-img]][codecov] [![Dependencies][deps-img]][deps]

> *Preppy* - A Simple and lightweight tool for preparing the publish of NPM packages.

[sponsor-img]: https://img.shields.io/badge/Sponsored%20by-Sebastian%20Software-692446.svg
[sponsor]: https://www.sebastian-software.de
[deps]: https://david-dm.org/sebastian-software/preppy
[deps-img]: https://david-dm.org/sebastian-software/preppy.svg
[npm]: https://www.npmjs.com/package/preppy
[npm-downloads-img]: https://img.shields.io/npm/dm/preppy.svg
[npm-version-img]: https://img.shields.io/npm/v/preppy.svg
[travis-img]: https://img.shields.io/travis/sebastian-software/preppy/master.svg?branch=master&label=unix%20build
[appveyor-img]: https://img.shields.io/appveyor/ci/swernerx/preppy/master.svg?label=windows%20build
[travis]: https://travis-ci.org/sebastian-software/preppy
[appveyor]: https://ci.appveyor.com/project/swernerx/preppy/branch/master
[codecov-img]: https://img.shields.io/codecov/c/github/codecov/example-python.svg
[codecov]: https://codecov.io/gh/sebastian-software/preppy

To keep things simple and reduce to number of dependencies, *Preppy* uses your local Babel configuration to transpile your code. You have to make sure that all required Babel mechanics, presets and plugins are installed locally to your project.

Preppy also support extracting *TypeScript* types into `.d.ts` files to make them usable by users of your libraries. The generated code is still transpiled by Babel. The standard `typescript` CLI is used for extracting the types.

## Input Files

These are the typical entry points looked up for by *Preppy*:

- `src/index.{js|jsx|ts|tsx}`

We made the experience that this works pretty fine for most projects. If you have the need for more input files, please report back to us.

## Output Targets

*Preppy* produces exports of your sources depending on the entries of your packages `package.json`. It supports building for *ESM*, *CommonJS* and *UMD*. Just add the relevant entries to the package configuration.

- *CommonJS*: `main`
- *EcmaScript Modules (ESM)*: `module`: New module standard for optimal tree shaking of bundlers.
- *Universal Module Definition (UMD)*: `umd` + `unpkg` for delivering a minified bundle to the CDN.

Basic Example:

```json
{
  "name": "mypackage",
  "main": "lib/index.cjs.js",
  "module": "lib/index.esm.js",
  "unpkg": "lib/index.umd.min.js",
}
```

For exporting types with TypeScript you should add a `types` entry to your `package.json` as well:

```json
{
  "name": "mypackage",
  "main": "lib/index.cjs.js",
  "module": "lib/index.esm.js",
  "unpkg": "lib/index.umd.min.js",
  "types": "lib/index.d.ts"
}
```


## Binary Output

Additionally *Preppy* is capable in generating for binary targets e.g. CLI tools.

This generates a `mypackage` binary which is generated from the matching source file.

Binaries are generally generated from one of these source files:

- `src/cli.{js|ts}`
- `src/cli/index.{js|ts}`

Example Configuration:

```json
{
  "name": "mycli",
  "bin": {
    "mycli": "bin/mycli"
  }
}
```


## Universal Output

*Preppy* also has some support for building universal libraries. While for most projects it's completely feasible
to have one library for both NodeJS and browsers (or only for one of these), others might want (slightly) different
packages to browsers and NodeJS.

The only difference here is that you have to define a new `browser` definition inside your `package.json`. Also
the input fields differ from the one of the normal libraries or binaries:

- `src/client.{js|jsx|ts|tsx}`
- `src/browser.{js|jsx|ts|tsx}`
- `src/client/index.{js|jsx|ts|tsx}`
- `src/browser/index.{js|jsx|ts|tsx}`

For the NodeJS part you can use any of the following entries:

- `src/node.{js|jsx|ts|tsx}`
- `src/server.{js|jsx|ts|tsx}`
- `src/node/index.{js|jsx|ts|tsx}`
- `src/server/index.{js|jsx|ts|tsx}`

Example Configuration:

```json
{
  "name": "mylib",
  "browser": "lib/browser.esm.js",
  "unpkg": "lib/browser.umd.js",
  "main": "lib/node.cjs.js",
  "module": "lib/node.esm.js"
}
```

Note: The bundle under `browser` is a ESM bundle which is ideally used by bundlers like *Webpack* or *Parcel*.

Note: When any of these files exists, we use prefer it over the normal library for the `unpkg` entry in `package.json` as well.

## Environment Settings

*Preppy* injects these environment values into your code base:

- `process.env.BUNDLE_NAME`: Extracted `name` field from `package.json`.
- `process.env.BUNDLE_VERSION`: Extracted `version` field from `package.json`.
- `process.env.BUNDLE_TARGET`: One of the supported targets. Either
- `process.env.NODE_ENV`: Injects environment config e.g. via `NODE_ENV="production" preppy` (optional)

These values are injected into your code base by replacing the original instance.

Note: It only works correctly when you use the whole identifier.

Note: In verbose mode we are logging the environment settings configured.


## Installation

```console
$ npm install --save-dev preppy
```


## Configure Babel

As transpiling happens via Babel you have to install the *Babel* Core, Plugins and Presets on your own. You also need to use a standard Babel Configuration inside your package.

Example `babel.config.js` (has to be CommonJS unfortunately):

```js
module.exports = (api) => {
  const env = api.env()
  const caller = api.caller((inst) => (inst && inst.name) || "any")

  const isBundler = caller === "rollup-plugin-babel"
  const isCli = caller === "@babel/node"
  const isTest = (/\b(test)\b/).exec(env)
  const modules = (isTest && !isBundler) || isCli ? "commonjs" : false
  const isUmd = (/\b(umd)\b/).exec(env)

  return {
    sourceMaps: true,
    plugins: [
      isUmd ? null : "@babel/transform-runtime"
    ].filter(Boolean),
    presets: [
      [
        "@babel/env",
        {
          useBuiltIns: "usage",
          loose: true,
          modules
        }
      ],
      [
        "@babel/typescript",
        {
          allExtensions: true,
          isTSX: true
        }
      ]
    ]
  }
}
```

Note: `env` gets a lot more depth when working with *Preppy*. It's actually set to this: `${env}-${target}-${format}` e.g. `"development-browser-esm"`. This gives you more control e.g. more setting up targets for *Browserslist*.

Note: Leave out the `"@babel/typescript"` when you do not need TypeScript transpiling.

Note: Please disable `transform-runtime` for all UMD builds as UMD is better working when only clean named imports are kept external.

### Installing Babel Dependencies

```console
$ npm install --save-dev @babel/plugin-transform-runtime @babel/preset-env @babel/preset-typescript @babel/core
$ npm install --save @babel/runtime corejs
```


## Usage

*Preppy* comes with a binary which can be called from within your `scripts` section
in the `package.json` file.

```json
"scripts": {
  "prepare": "preppy"
}
```

There is also some amount of parameters you can use if the auto detection of your library does not work out correctly.

```
Usage
  $ preppy

Options
  --entry-lib        Entry file for Library (universal) target [auto]
  --entry-browser    Entry file for Browser target [auto]
  --entry-node       Entry file for NodeJS target [auto]
  --entry-cli        Entry file for CLI target [auto]

  --root             The root folder of your project [auto]
  --output           Override output folder (and package.json entries) [auto]

  -m, --sourcemap    Create a source map file during processing [true]
  -v, --verbose      Verbose output mode [false]
  -q, --quiet        Quiet output mode [false]
```


## License

[Apache License; Version 2.0, January 2004](http://www.apache.org/licenses/LICENSE-2.0)


## Copyright

<img src="https://cdn.rawgit.com/sebastian-software/sebastian-software-brand/0d4ec9d6/sebastiansoftware-en.svg" alt="Logo of Sebastian Software GmbH, Mainz, Germany" width="460" height="160"/>

Copyright 2016-2018<br/>[Sebastian Software GmbH](http://www.sebastian-software.de)
