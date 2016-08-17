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

const styleExtensions =
{
  ".css": null,
  ".sss": postcssParserSugarss,
  ".scss": postcssParserScss
}

const postcssPlugins = [
  postcssSmartImport()
]

function processStyle(code, id, dest)
{
  var parser = styleExtensions[path.extname(id)]
  return postcss(postcssPlugins)
    .process(code,
      {
        from: id,
        to: dest,
        parser: parser,
        extensions: ['.css', '.sss', '.scss']
      })
    .then((result) => {
      return writeAsync(dest, result)
    })
    .catch(function(err) {
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

const externalIds = {}


export default function(outputFolder)
{
  return {
    name: "file-loader",

    isExternal: function(id) {
      var baseName = "./" + path.basename(id)
      if (baseName in externalIds) {
        return true;
      }
    },

    resolveId: function(importee, importer) {
      console.log("RR: Testing:", importee)
      if (importee in externalIds) {
        console.log("RR: Marking external!")

        // This does not seem to work!

        // "returning any other falsy value signals that importee should be treated as an external module
        // and not included in the bundle." -- https://github.com/rollup/rollup/wiki/Plugins#creating-plugins
        return false
      }

      console.log("RR: Delegating...")
    },


    transformxx: function(code, id)
    {
      if (!isAssetFile(id))
        return null

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
            var destExt = fileExt in styleExtensions ? ".css" : fileExt
            var fileHash = hash.digest("hex").slice(0, 8)
            var idDest = path.basename(id, fileExt) + "-" + fileHash + destExt
            var fileDest = path.join(outputFolder, idDest)

            externalIds["./" + idDest] = true

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
