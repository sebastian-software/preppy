import fs from "fs"

import stripBom from "strip-bom"
import stripComments from "strip-json-comments"
import { fromCallback } from "universalify"

function readJSONCb(file, callback) {
  fs.readFile(file, { encoding: "utf-8" }, (readError, data) => {
    if (readError) {
      return callback(readError)
    }

    const json = stripComments(stripBom(data))

    let obj

    try {
      obj = JSON.parse(json)
    } catch (decodeError) {
      decodeError.message = `${file}: ${decodeError.message}`
      return callback(decodeError)
    }

    return callback(null, obj)
  })
}

export const readJSON = fromCallback(readJSONCb)
