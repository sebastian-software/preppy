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
    root: __dirname
  })

  expect(
    await lazyRead(resolve(__dirname, "dist/index.cjs.js"), "utf8")
  ).toMatchSnapshot()
  expect(
    await lazyRead(resolve(__dirname, "dist/index.esm.js"), "utf8")
  ).toMatchSnapshot()
  expect(
    await lazyRead(resolve(__dirname, "dist/index.umd.js"), "utf8")
  ).toMatchSnapshot()
})
