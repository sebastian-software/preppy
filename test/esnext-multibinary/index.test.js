/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"
import pify from "pify"
import rimraf from "rimraf"

import preppy from "../../src/index"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Multi Binary from ESNext", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  await preppy({
    root: __dirname
  })

  expect(
    await lazyRead(resolve(__dirname, "bin/first-cli.js"), "utf8")
  ).toMatchSnapshot("first")
  expect(
    await lazyRead(resolve(__dirname, "bin/second-cli.js"), "utf8")
  ).toMatchSnapshot("second")
})
