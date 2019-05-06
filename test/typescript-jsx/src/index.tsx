/* eslint-disable no-magic-numbers */
/* eslint-disable func-style */
/* eslint-disable no-empty-function */
/* eslint-disable lodash/prefer-noop */
/* eslint-disable no-console */
/* eslint-disable no-var */
/* eslint-disable prefer-const */

import { camelCase } from "lodash"
import React from "react"
import { FormattedMessage } from "react-intl"

import { FormValues, something, Item } from "./types"

console.log("CherryPick Import Lodash:", camelCase("hello world") === "helloWorld")

console.log("Imported JS from other file:", something)
console.log("Package", process.env.BUNDLE_NAME)
console.log("Target", process.env.BUNDLE_TARGET)

console.log("ES2016 Enabled:", 2 ** 2 === 4)

new Promise((resolve, reject) => {
  resolve("resolved")
}).then((first) => {
  console.log("Promise:", first)
})

const CONSTANT: number = 123
console.log("Constant:", CONSTANT)

var myArray = [ 1, 2, 3 ]
console.log("Supports Array.includes?:", myArray.includes && myArray.includes(2))

var mySet = new Set(myArray)
console.log("Supports Set:", mySet.add(4))
;(function(supportsDefault = true) {
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

export class MyClass {
  constructor() {
    console.log("Called constructor")
    this.helper()
    this.instanceProperty = 3
  }

  onClick = () => {
    console.log("Clickedx")
  }

  helper(x: string) {
    console.log("Called helper: " + x)
  }
}

class SecondClass extends MyClass() {
  constructor() {
    super(100)
  }
}

console.log("Initialized class:", new MyClass())

async function helper() {
  await PromiseHelper()

  return 42
}

helper()

export const setValues = (values: FormValues) => {
  setState({ values }, () => true)
}

export { Item }

export function MyButton() {
  return (
    <button>
      <FormattedMessage id="press-button" />
    </button>
  )
}
