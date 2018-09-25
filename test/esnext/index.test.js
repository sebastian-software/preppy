/* global __dirname */
import { exec } from "child_process"
import { readFile } from "fs"
import { resolve } from "path"
import pify from "pify"
import rimraf from "rimraf"

import pkg from "./package.json"

const lazyExec = pify(exec)
const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Publish Test File via Babel", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  console.log(await lazyExec(`node ../../bin/preppy`, { cwd: __dirname }))

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
