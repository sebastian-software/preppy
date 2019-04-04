/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"
import pify from "pify"
import rimraf from "rimraf"

import preppy from "../../src/index"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Publish Test File via Babel", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  await preppy({
    root: __dirname,
    quiet: true
  })

  expect(
    await lazyRead(resolve(__dirname, "dist/index.cjs.min.js"), "utf8")
  ).toMatchSnapshot("cjs")
  expect(
    await lazyRead(resolve(__dirname, "dist/index.esm.min.js"), "utf8")
  ).toMatchSnapshot("esm")
  expect(
    await lazyRead(resolve(__dirname, "dist/index.umd.min.js"), "utf8")
  ).toMatchSnapshot("umd")
})
