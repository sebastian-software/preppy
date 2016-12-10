# *Pre Publish Lib* <br/>[![Sponsored by][sponsor-img]][sponsor] [![Version][npm-version-img]][npm] [![Downloads][npm-downloads-img]][npm] [![Build Status Unix][travis-img]][travis] [![Build Status Windows][appveyor-img]][appveyor] [![Dependencies][deps-img]][deps]

*Pre Publish Lib* is a solution for simplifying pre-publishing typical JavaScript projects for publishing to NPM.

[sponsor-img]: https://img.shields.io/badge/Sponsored%20by-Sebastian%20Software-692446.svg
[sponsor]: https://www.sebastian-software.de
[deps]: https://david-dm.org/sebastian-software/prepublish-lib
[deps-img]: https://david-dm.org/sebastian-software/prepublish-lib.svg
[npm]: https://www.npmjs.com/package/prepublish-lib
[npm-downloads-img]: https://img.shields.io/npm/dm/prepublish-lib.svg
[npm-version-img]: https://img.shields.io/npm/v/prepublish-lib.svg
[travis-img]: https://img.shields.io/travis/sebastian-software/prepublish-lib/master.svg?branch=master&label=unix%20build
[appveyor-img]: https://img.shields.io/appveyor/ci/swernerx/prepublish-lib/master.svg?label=windows%20build
[travis]: https://travis-ci.org/sebastian-software/prepublish-lib
[appveyor]: https://ci.appveyor.com/project/swernerx/prepublish-lib/branch/master


## Transpilers

*Pre Publish Lib* includes three transpiler configurations:

- **[Buble](https://buble.surge.sh/guide/)**: Blazing fast ES2015+ transpiler where the goal is to have lightweight runtime code, too.
- **[Babel Latest](https://babeljs.io/docs/plugins/preset-latest/)**: Latest configuration of Babel. Includes all of ES2015/ES2016/ES2017. Plus some ES3 helpers for maximum compability. Plus Support for [Object-Rest-Spread](https://babeljs.io/docs/plugins/transform-object-rest-spread/) and [Class Properties](https://babeljs.io/docs/plugins/transform-class-properties/). Uses [Transform-Runtime](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime) to externalize requirements to Polyfills. Resulting code needs all Polyfills for each library published with this tool. Typically by using services like [polyfill.io](https://qa.polyfill.io/v2/docs/) or [Babel Runtime](https://github.com/babel/babel/tree/master/packages/babel-runtime) aka [CoreJS](https://github.com/zloirock/core-js).
- **React Latest**: Like Babel Latest but with [React JSX transpilation](https://babeljs.io/docs/plugins/transform-react-jsx/). Plus support for encapsulating PropTypes. Plus optimization for constant elements during rendering.


## Classic & Modern

*Pre Publish Lib* produces 


## Links

- [GitHub](https://github.com/sebastian-software/prepublish-lib)
- [NPM](https://www.npmjs.com/package/prepublish-lib)



## Installation

```console
$ npm install --save-dev prepublish-lib
```

## Usage

*Pre Publish Lib* comes with a binary which can be called from within your `scripts` section
in the `package.json` file.

```json
"scripts": {
  "prepublish": "prepublish-lib"
}
```

## Contributing

* Pull requests and stars are always welcome.
* For bugs and feature requests, please create an issue.
* Pull requests must be accompanied by passing automated tests (`$ npm test`).

## [License](license)



## Copyright

<img src="assets/sebastiansoftware.png" alt="Sebastian Software GmbH Logo" width="250" height="200"/>

Copyright 2016<br/>[Sebastian Software GmbH](http://www.sebastian-software.de)
