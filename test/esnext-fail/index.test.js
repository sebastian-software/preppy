/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import preppy from "../../src/index"

const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Publish Test File via Babel", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  await expect(
    preppy({
      root: __dirname,
      quiet: true
    })
  ).rejects.toThrow(`SyntaxError: Unexpected token (2:17)`)
})
