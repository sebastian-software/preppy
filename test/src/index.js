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

new Promise(function(resolve, reject) {
  resolve("resolved")
}).then(function(first) {
  console.log("Promise:", first)
})

var source = { first: 1, second: 2 }
var destructed = { third: 3, ...source }
console.log("Destructed:", destructed)

var ReactTest = function() {}

var React = {
  createElement: function(TestClass) {
    return new TestClass()
  }
}

console.log("React Enabled:", <ReactTest>Hello</ReactTest> instanceof ReactTest)
