import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const themeDirectory = fileURLToPath(new URL("../src/themes/", import.meta.url))
const guiPath = new URL("../src/gui.tsx", import.meta.url)
const files = (await readdir(themeDirectory)).filter((file) => file.endsWith(".json")).sort()
const errors = []
const ids = new Set()
const names = new Set()
let minimumInkContrast = Infinity
let minimumTextContrast = Infinity
let minimumRuleContrast = Infinity

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255)
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
}

function report(file, message) {
  errors.push(`${file}: ${message}`)
}

if (files.length === 0) errors.push("src/themes: no theme JSON files found")

for (const file of files) {
  const filePath = join(themeDirectory, file)
  let theme

  try {
    theme = JSON.parse(await readFile(filePath, "utf8"))
  } catch (error) {
    report(file, `invalid JSON (${error.message})`)
    continue
  }

  if (typeof theme.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(theme.id)) {
    report(file, "id must be lowercase kebab-case")
  } else if (ids.has(theme.id)) {
    report(file, `duplicate id "${theme.id}"`)
  } else {
    ids.add(theme.id)
  }

  if (typeof theme.name !== "string" || theme.name.trim() === "") {
    report(file, "name must be a non-empty string")
  } else if (names.has(theme.name)) {
    report(file, `duplicate name "${theme.name}"`)
  } else {
    names.add(theme.name)
  }

  for (const mode of ["light", "dark"]) {
    const variant = theme[mode]
    if (!variant || !variant.palette || typeof variant.palette !== "object") {
      report(file, `${mode} variant must define a palette`)
      continue
    }

    const { palette, overrides = {} } = variant
    for (const key of ["neutral", "ink"]) {
      if (!isHexColor(palette[key])) report(file, `${mode}.palette.${key} must be a six-digit hex color`)
    }

    for (const [key, value] of Object.entries(palette)) {
      if (!isHexColor(value)) report(file, `${mode}.palette.${key} must be a six-digit hex color`)
    }

    for (const [key, value] of Object.entries(overrides)) {
      if (!isHexColor(value)) report(file, `${mode}.overrides.${key} must be a six-digit hex color`)
    }

    if (!isHexColor(palette.neutral) || !isHexColor(palette.ink)) continue

    const inkContrast = contrastRatio(palette.ink, palette.neutral)
    minimumInkContrast = Math.min(minimumInkContrast, inkContrast)
    if (inkContrast < 7) report(file, `${mode} ink/neutral contrast is ${inkContrast.toFixed(2)}:1; expected at least 7:1`)

    for (const [key, value] of Object.entries(overrides)) {
      if (!/^(syntax-|markdown-)/.test(key) || !isHexColor(value)) continue
      const ratio = contrastRatio(value, palette.neutral)
      if (key === "markdown-horizontal-rule") {
        minimumRuleContrast = Math.min(minimumRuleContrast, ratio)
        if (ratio < 3) report(file, `${mode} ${key}/neutral contrast is ${ratio.toFixed(2)}:1; expected at least 3:1`)
      } else {
        minimumTextContrast = Math.min(minimumTextContrast, ratio)
        if (ratio < 4.5) report(file, `${mode} ${key}/neutral contrast is ${ratio.toFixed(2)}:1; expected at least 4.5:1`)
      }
    }
  }
}

const gui = await readFile(guiPath, "utf8")
const imports = [...gui.matchAll(/import\s+([\w$]+)\s+from\s+["']\.\/themes\/([^"']+)\.json["']/g)]
const registered = gui.match(/const themes\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? ""
const importedFiles = new Set(imports.map((match) => `${match[2]}.json`))

for (const file of files) {
  if (!importedFiles.has(file)) report("src/gui.tsx", `${file} is not imported`)
}

for (const [, variable, themeFile] of imports) {
  if (!files.includes(`${themeFile}.json`)) report("src/gui.tsx", `${themeFile}.json does not exist`)
  if (!new RegExp(`\\b${variable}\\b`).test(registered)) report("src/gui.tsx", `${themeFile}.json is imported but not registered`)
}

if (imports.length !== files.length) report("src/gui.tsx", "theme imports and theme files must match one-to-one")

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exitCode = 1
} else {
  console.log(`Validated ${files.length} themes and ${files.length * 2} variants.`)
  console.log(`Minimum contrast: ink ${minimumInkContrast.toFixed(2)}:1, text ${minimumTextContrast.toFixed(2)}:1, rules ${minimumRuleContrast.toFixed(2)}:1.`)
}
