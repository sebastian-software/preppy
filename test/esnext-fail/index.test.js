/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Publish Test File via Babel", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  await expect(
    preppy({
      cwd: __dirname,
    })
  ).rejects.toThrow("SyntaxError: src/index.js: Unexpected token, expected \";\" (2:17)")
})
