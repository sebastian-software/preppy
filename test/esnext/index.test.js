/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

test("Publish Test File via Babel", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  await preppy({
    cwd: __dirname
  })

  expect(await lazyRead(resolve(__dirname, "dist/index.cjs.js"), "utf8")).toMatchSnapshot(
    "cjs"
  )
  expect(await lazyRead(resolve(__dirname, "dist/index.esm.js"), "utf8")).toMatchSnapshot(
    "esm"
  )
  expect(await lazyRead(resolve(__dirname, "dist/index.umd.js"), "utf8")).toMatchSnapshot(
    "umd"
  )
})
