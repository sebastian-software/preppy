var fs = require("fs")
var path = require("path")
var crypto = require("crypto");

export default function()
{
  return {
    name: "file-loader",
    transform: function(code, id) {
      var fileExt = path.extname(id).slice(1)
      if (fileExt === "" || (/^(json|jsx|js|es|es5|es6)$/).exec(fileExt))
        return null

      console.log("Transform: ", id, code)
      return {
        code: `export default null`,
        map: { mappings: "" }
      }
    },


    load: function(id)
    {
      var fileExt = path.extname(id).slice(1)
      if (fileExt === "" || (/^(json|jsx|js|es|es5|es6)$/).exec(fileExt))
        return null

      const input = fs.createReadStream(id)
      const hash = crypto.createHash("sha256")

      return new Promise((resolve, reject) =>
      {
        input.on("readable", () =>
        {
          var data = input.read()
          if (data)
          {
            hash.update(data);
          }
          else
          {
            var fileHasher = crypto.createHash("sha1")
            var fileSource = id
            var idDest = path.basename(id) + hash.digest("hex").slice(0, 6)
            var fileDest = path.join(outputFolder, idDest)

            return copyAsync(fileSource, fileDest).then(function()
            {
              console.log("Copied:", fileSource, "=>", fileDest)
              const ast = {
                type: "Program",
                sourceType: "module",
                start: 0,
                end: null,
                body: []
              }

              console.log(`import classes from "./${idDest}"; export default classes;`)

              resolve({
                ast,
                code: `import classes from "./${idDest}"; export default classes;`,
                map: { mappings: "" }
              })
            })
          }
        })
      })
    }
  }
}
