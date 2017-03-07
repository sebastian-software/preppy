/* eslint-disable no-magic-numbers */
/* eslint-disable func-style */
/* eslint-disable no-empty-function */
/* eslint-disable lodash/prefer-noop */

import { camelCase } from "lodash"
console.log("CherryPick Import Lodash:", camelCase("hello world") === "helloWorld")

import classes1 from "./index.css"
console.log("Classes from CSS:", classes1)

import classes2 from "./alternate.sss"
console.log("Classes from SSS:", classes2)

import url from "./logo.svg"
console.log("Logo URL:", url)

console.log("Package", process.env.NAME, process.env.VERSION)
console.log("Target", process.env.TARGET)

console.log("ES2016 Enabled:", 2 ** 2 === 4)

new Promise((resolve, reject) => {
  resolve("resolved")
}).then((first) => {
  console.log("Promise:", first)
})

const CONSTANT = 123
console.log("Constant:", CONSTANT)

var myArray = [ 1, 2, 3 ]
console.log("Supports Array.includes?:", myArray.includes && myArray.includes(2))

var mySet = new Set(myArray)
console.log("Supports Set:", mySet.add(4));

(function(supportsDefault = true) {
console.log("Supports default parameters:", supportsDefault)
})()

/* eslint-disable no-shadow */
let testVariable = "outer"
{
  let testVariable = "inner"
  console.log("X Value from inner scope:", testVariable)
}
console.log("X Value from outer scope:", testVariable)

var source = { first: 1, second: 2 }
var destructed = { third: 3, ...source }
console.log("Destructed:", destructed)

class MyClass {
  constructor() {
    console.log("Called constructor")
    this.helper()
  }

  helper() {
    console.log("Called helper")
  }
}

async function returnLate() {
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 300)
  })
}
console.log("Test Async:", returnLate() instanceof Promise)

console.log("Initialized class:", new MyClass())

var ReactTest = function() {}

var React = {
  createElement(TestClass) {
    return new TestClass()
  }
}

console.log("React Enabled:", <ReactTest>Hello</ReactTest> instanceof ReactTest)

// This is currently not supported by Rollup and throws a syntax error
// https://github.com/rollup/rollup/issues/1325
// It's currently stage3 not yet stage4. See also:
// https://tc39.github.io/proposal-dynamic-import/
// console.log("Dynamic Import returns Promise", import("./logo.svg"))
