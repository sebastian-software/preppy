/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

test("Publish Test File via Babel as Universal", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  await preppy({
    cwd: __dirname
  })

  expect(await lazyRead(resolve(__dirname, "dist/node.cjs.js"), "utf8")).toMatchSnapshot(
    "node-cjs"
  )
  expect(await lazyRead(resolve(__dirname, "dist/node.esm.js"), "utf8")).toMatchSnapshot(
    "node-esm"
  )
  expect(await lazyRead(resolve(__dirname, "dist/browser.esm.js"), "utf8")).toMatchSnapshot(
    "browser-esm"
  )
  expect(await lazyRead(resolve(__dirname, "dist/browser.umd.js"), "utf8")).toMatchSnapshot(
    "browser-umd"
  )
})
