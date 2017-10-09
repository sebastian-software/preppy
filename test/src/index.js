/* eslint-disable no-magic-numbers */
/* eslint-disable func-style */
/* eslint-disable no-empty-function */
/* eslint-disable lodash/prefer-noop */

import { camelCase } from "lodash"
console.log("CherryPick Import Lodash:", camelCase("hello world") === "helloWorld")

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

var someArrayProducer = () => [ 4, 5 ]
var mergedArray = [ 1, 2, 3, ...someArrayProducer(), 6 ]
console.log("Supports Array merging:", mergedArray.length === 6)

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
    this.instanceProperty = 3
  }

  helper() {
    console.log("Called helper")
  }

  boundFunction = () => {
    return this.instanceProperty;
  }
}

async function returnLate() {
  await new Promise((resolve, reject) => {
    setTimeout(resolve, 300)
  })
}
console.log("Test Async:", returnLate() instanceof Promise)

console.log("Initialized class:", new MyClass())
