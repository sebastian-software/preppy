import { join } from "path"

export default function getRollupOutputOptions({
  banner,
  format,
  name,
  target,
  root,
  output
}) {
  const shebang = "#!/usr/bin/env node"
  return {
    format,
    name,
    banner: target === "cli" ? `${shebang}\n\n${banner}` : banner,
    sourcemap: true,
    file: join(root, output)
  }
}
