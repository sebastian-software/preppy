/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import preppy from "../../src"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Binary from ESNext", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  await preppy({
    root: __dirname,
    quiet: true
  })

  expect(await lazyRead(resolve(__dirname, "bin/mycli.js"), "utf8")).toMatchSnapshot("cli")
})
