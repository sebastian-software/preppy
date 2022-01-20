/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyDelete = pify(rimraf)


test("Publish Test File via Babel", async () => {
  await lazyDelete(resolve(__dirname, "./dist"))

  await expect(
    preppy({
      cwd: __dirname
    })
  ).rejects.toThrow('Missing semicolon')
})
