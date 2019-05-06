const walk = require("estree-walker").walk
const MagicString = require("magic-string")

let nextId = 0

function getJsxName(node) {
  if (node.type === "JSXMemberExpression") {
    return `${getJsxName(node.object)}.${getJsxName(node.property)}`
  }
  return node.name
}

export default () => ({
  transform(code) {
    const magicString = new MagicString(code)
    const idsByName = new Map()
    const ast = this.parse(code)
    walk(ast, {
      enter(node) {
        if (node.type === "JSXMemberExpression" || node.type === "JSXIdentifier") {
          const name = getJsxName(node)
          const tagId = idsByName.get(name) || `JSX_PLUGIN_ID_${nextId++}`

          // overwrite all JSX tags with artificial tag ids so that we can find them again later
          magicString.overwrite(node.start, node.end, tagId)
          idsByName.set(name, tagId)

          // if this is a JSXMemberExpression, do not treat the children as separate identifiers
          this.skip()
        }
      }
    })

    if (idsByName.size > 0) {
      const usedNamesAndIds = Array.from(idsByName).map(
        ([ name, tagId ]) => `/*${tagId}*/${name}`
      )
      magicString.append(`;USED_JSX_NAMES(React,${usedNamesAndIds.join(",")});`)
      return magicString.toString()
    }
  },
  renderChunk(code) {
    const replacements = new Map()
    return (
      code

        // this finds all injected artificial usages from the transform hook, removes them
        // and collects the new variable names as a side-effect
        .replace(/USED_JSX_NAMES\(([^)]*)\);/g, (_, args) => {
          args
            .split(",")

            // this extracts the artificial tag id from the comment and the possibly renamed variable
            // name from the variable via two capture groups
            .map((arg) => arg.match(/^\/\*([^*]*)\*\/(.*)$/))
            .slice(1)
            .forEach(([ _, tagId, updatedName ]) => replacements.set(tagId, updatedName))
          return ""
        })

        // this replaces the artificial tag ids in the actual JSX tags
        .replace(/JSX_PLUGIN_ID_\d+/g, (tagId) => replacements.get(tagId))
    )
  }
})
