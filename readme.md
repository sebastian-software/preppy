# *Preppy* <br/>[![Sponsored by][sponsor-img]][sponsor] [![Version][npm-version-img]][npm] [![Downloads][npm-downloads-img]][npm] [![Build Status Unix][travis-img]][travis] [![Build Status Windows][appveyor-img]][appveyor] [![Dependencies][deps-img]][deps]

<a target='_blank' rel='nofollow' href='https://app.codesponsor.io/link/Nehv39FW5U4NHEn7axuGx4CE/sebastian-software/preppy'>  <img alt='Sponsor' width='888' height='68' src='https://app.codesponsor.io/embed/Nehv39FW5U4NHEn7axuGx4CE/sebastian-software/preppy.svg' /></a>

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

*Preppy* includes a Babel-based transpiler configuration which supports all of ES2015/ES2016/ES2017. Plus support for [Object-Rest-Spread](https://babeljs.io/docs/plugins/transform-object-rest-spread/) and [Class Properties](https://babeljs.io/docs/plugins/transform-class-properties/). The High-performance async engine with support for generators and async/await powered by [fast-async](https://github.com/MatAtBread/fast-async) is enabled by default. It requires [nodent-runtime](https://github.com/MatAtBread/nodent-runtime) to be installed when using modern async features. It uses [Transform-Runtime](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime) to externalize requirements to Polyfills. Resulting code needs all Polyfills for each library published with this tool. Typically by using services like [polyfill.io](https://qa.polyfill.io/v2/docs/) or [Babel Runtime](https://github.com/babel/babel/tree/master/packages/babel-runtime) aka [CoreJS](https://github.com/zloirock/core-js).


## Output Targets

*Preppy* produces exports of your sources depending on the entries of your packages `package.json`. It supports building for *CommonJS* and well as with ES Modules (ESM). Just add the relevant entries to the configuration.

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


## Installation

### NPM

```console
$ npm install --save-dev preppy
```

### Yarn

```console
$ yarn add --dev preppy
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
  --input            Input file [default = auto]
  --output-folder    Configure the output folder [default = auto]

  -m, --sourcemap    Create a source map file during processing
  -v, --verbose      Verbose output mode [default = false]
  -q, --quiet        Quiet output mode [default = false]
```


## License

[Apache License; Version 2.0, January 2004](http://www.apache.org/licenses/LICENSE-2.0)


## Copyright

<img src="assets/sebastiansoftware.png" alt="Sebastian Software GmbH Logo" width="250" height="200"/>

Copyright 2016-2017<br/>[Sebastian Software GmbH](http://www.sebastian-software.de)
