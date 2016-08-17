import fs from "fs"
import path from "path"
import crypto from "crypto"
import denodeify from "denodeify"
import fse from "fs-extra"

import postcss from "postcss"
import postcssSmartImport from "postcss-smart-import"
import postcssParserSugarss from "sugarss"
import postcssParserScss from "postcss-scss"

var copyAsync = denodeify(fse.copy)
var writeAsync = denodeify(fse.outputFile)

function isAssetFile(id) {
  var fileExt = path.extname(id).slice(1)
  return !(fileExt === "" || (/^(json|jsx|js|es|es5|es6)$/).exec(fileExt))
}


const styleExtensions = {
  ".css": null,
  ".sss": postcssParserSugarss,
  ".scss": postcssParserScss
}

const postcssPlugins = [
  postcssSmartImport()
]

function processStyle(code, id, dest) {
  return postcss(postcssPlugins)
    .process(code, { from: id, to: dest }).then((result) => {
      return writeAsync(dest, result)
    }).catch(function(err) {
      console.error(err)
    })
}

const staticAST = {
  type: "Program",
  sourceType: "module",
  start: 0,
  end: null,
  body: []
}


export default function(outputFolder)
{
  return {
    name: "file-loader",
    transform: function(code, id)
    {
      if (!isAssetFile(id))
        return null

      console.log("Transform: ", id, code)
      return {
        code: `export default "FIXME-PROTECT-IMPORT"`,
        map: { mappings: "" }
      }
    },


    load: function(id)
    {
      if (!isAssetFile(id))
        return null

      const input = fs.createReadStream(id)
      const hash = crypto.createHash("sha256")

      var fileData = ""

      return new Promise((resolve, reject) =>
      {
        input.on("readable", () =>
        {
          var data = input.read()
          if (data)
          {
            fileData += data
            hash.update(data);
          }
          else
          {
            var fileHasher = crypto.createHash("sha1")
            var fileSource = id
            var fileExt = path.extname(id)
            var fileHash = hash.digest("hex").slice(0, 8)
            var idDest = path.basename(id, fileExt) + "-" + fileHash + fileExt
            var fileDest = path.join(outputFolder, idDest)


            if (fileExt in styleExtensions)
            {
              console.log("Processing style:", id)

              return processStyle(fileData, fileSource, fileDest).then(function()
              {
                console.log("Processed:", fileSource, "=>", fileDest)

                resolve({
                  ast : staticAST,
                  code: `import h${fileHash} from "./${idDest}"; export default h${fileHash};`,
                  map: { mappings: "" }
                })
              })
            }
            else
            {
              console.log("Processing asset:", id)

              return copyAsync(fileSource, fileDest).then(function()
              {
                console.log("Copied:", fileSource, "=>", fileDest)

                resolve({
                  ast : staticAST,
                  code: `import h${fileHash} from "./${idDest}"; export default h${fileHash};`,
                  map: { mappings: "" }
                })
              })
            }
          }
        })
      })
    }
  }
}
