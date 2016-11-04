/* eslint-disable no-magic-numbers */
/* eslint-disable func-style */
/* eslint-disable no-empty-function */
/* eslint-disable lodash/prefer-noop */

import classes1 from "./index.css"
console.log("Classes from CSS:", classes1)

import classes2 from "./alternate.sss"
console.log("Classes from SSS:", classes2)

import url from "./logo.svg"
console.log("Logo URL:", url)

console.log("ES2016 Enabled:", 2 ** 2 === 4)

var ReactTest = function() {}

var React = {
  createElement: function(TestClass) {
    return new TestClass()
  }
}

console.log("React Enabled:", <ReactTest>Hello</ReactTest> instanceof ReactTest)
