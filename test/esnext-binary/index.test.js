/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)


test("Binary from ESNext", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  await preppy({
    cwd: __dirname
  })

  expect(await lazyRead(resolve(__dirname, "bin/mycli.js"), "utf8")).toMatchSnapshot("cli")
})
