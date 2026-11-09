import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const themeDirectory = fileURLToPath(new URL("../src/themes/", import.meta.url))
const outputDirectory = fileURLToPath(new URL("../assets/", import.meta.url))
const files = (await readdir(themeDirectory)).filter((file) => file.endsWith(".json")).sort()
const themes = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(themeDirectory, file), "utf8"))))
const moods = {
  "aurum-tide": "Sea glass · copper",
  "blood-frost": "Garnet · glacier",
  emberwave: "Slate · ember",
  "midnight-earth": "Charcoal · terracotta",
  "pine-frost": "Evergreen · frost",
  "rustic-winter": "Bark · parchment",
  "slate-mist": "Stone · sage",
  "thirteen-grove": "Forest · antique gold",
  "velvet-tide": "Aubergine · teal",
}

const width = 1400
const margin = 40
const columns = 3
const cardWidth = 426
const cardHeight = 400
const columnGap = 20
const rowGap = 20
const top = 148
const rows = Math.ceil(themes.length / columns)
const height = top + rows * cardHeight + (rows - 1) * rowGap + 40

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character])
}

function label(x, y, value, { size = 14, fill = "#e7edf5", weight = 400, family = "Inter,Arial,sans-serif", letterSpacing = 0 } = {}) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${escapeXml(value)}</text>`
}

function preview(theme, mode, x, y, panelWidth) {
  const variant = theme[mode]
  const { palette, overrides = {} } = variant
  const panelHeight = 306
  const screenX = x + 10
  const screenY = y + 42
  const screenWidth = panelWidth - 20
  const screenHeight = 182
  const keyword = overrides["syntax-keyword"] ?? palette.primary
  const string = overrides["syntax-string"] ?? palette.success
  const property = overrides["syntax-property"] ?? palette.info
  const comment = overrides["syntax-comment"] ?? palette.ink
  const swatches = ["primary", "accent", "success", "warning", "error", "info"]
  const swatchWidth = (panelWidth - 34) / swatches.length
  const parts = [
    `<g aria-label="${mode} variant">`,
    `<rect x="${x}" y="${y}" width="${panelWidth}" height="${panelHeight}" rx="14" fill="${palette.neutral}" stroke="#384554" stroke-opacity="0.65"/>`,
    label(x + 12, y + 25, mode.toUpperCase(), { size: 11, fill: palette.ink, weight: 700, letterSpacing: 1.4 }),
    `<rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="${screenHeight}" rx="9" fill="${palette.neutral}" stroke="${palette.ink}" stroke-opacity="0.22"/>`,
    `<circle cx="${screenX + 13}" cy="${screenY + 14}" r="3" fill="${palette.error}"/>`,
    `<circle cx="${screenX + 24}" cy="${screenY + 14}" r="3" fill="${palette.warning}"/>`,
    `<circle cx="${screenX + 35}" cy="${screenY + 14}" r="3" fill="${palette.success}"/>`,
    label(screenX + 12, screenY + 45, "const theme =", { size: 12, fill: keyword, family: "ui-monospace,Consolas,monospace" }),
    label(screenX + 12, screenY + 66, `"${theme.name}"`, { size: 12, fill: string, family: "ui-monospace,Consolas,monospace" }),
    label(screenX + 12, screenY + 91, "palette.primary", { size: 12, fill: property, family: "ui-monospace,Consolas,monospace" }),
    `<rect x="${screenX + 12}" y="${screenY + 105}" width="${screenWidth - 24}" height="1" fill="${overrides["markdown-horizontal-rule"] ?? palette.ink}"/>`,
    label(screenX + 12, screenY + 128, "// clear comments", { size: 11, fill: comment, family: "ui-monospace,Consolas,monospace" }),
    label(screenX + 12, screenY + 157, "Aa  0123  {}  =>", { size: 15, fill: palette.ink, weight: 600, family: "ui-monospace,Consolas,monospace" }),
    label(x + 12, y + 248, "PALETTE", { size: 9, fill: palette.ink, weight: 700, letterSpacing: 1.2 }),
  ]

  swatches.forEach((key, index) => {
    const sx = x + 12 + index * (swatchWidth + 2)
    const color = palette[key]
    parts.push(`<rect x="${sx}" y="${y + 260}" width="${swatchWidth}" height="18" rx="4" fill="${color}"/>`)
    parts.push(label(sx + swatchWidth / 2, y + 294, key, { size: 8, fill: palette.ink, family: "ui-monospace,Consolas,monospace" }))
    parts[parts.length - 1] = parts[parts.length - 1].replace(`<text x="${sx + swatchWidth / 2}"`, `<text text-anchor="middle" x="${sx + swatchWidth / 2}"`)
  })

  parts.push("</g>")
  return parts.join("")
}

const body = themes.map((theme, index) => {
  const column = index % columns
  const row = Math.floor(index / columns)
  const x = margin + column * (cardWidth + columnGap)
  const y = top + row * (cardHeight + rowGap)
  const panelY = y + 74
  const panelWidth = (cardWidth - 42) / 2
  const leftX = x + 14
  const rightX = leftX + panelWidth + 14
  const mood = moods[theme.id] ?? "Light + dark variants"

  return [
    `<g aria-label="${escapeXml(theme.name)} theme preview">`,
    `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="20" fill="#121922" stroke="#2c3744"/>`,
    label(x + 18, y + 34, theme.name, { size: 22, weight: 700 }),
    label(x + 18, y + 57, mood, { size: 12, fill: "#9ca9b8" }),
    preview(theme, "light", leftX, panelY, panelWidth),
    preview(theme, "dark", rightX, panelY, panelWidth),
    "</g>",
  ].join("")
}).join("")

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">`,
  "<title id=\"title\">OpenCode Themes gallery</title>",
  "<desc id=\"description\">Nine palette-driven theme previews, each showing light and dark variants.</desc>",
  `<rect width="${width}" height="${height}" fill="#0b1016"/>`,
  label(margin, 62, "OpenCode Themes", { size: 36, weight: 700 }),
  label(margin, 94, "Nine color systems · light and dark variants · previews generated from theme tokens", { size: 15, fill: "#a9b5c3" }),
  label(width - margin, 62, "OPENCODE · DESKTOP", { size: 11, fill: "#8392a2", weight: 700, letterSpacing: 1.5 }).replace(`<text x="${width - margin}"`, `<text text-anchor="end" x="${width - margin}"`),
  body,
  "</svg>",
].join("\n")

await mkdir(outputDirectory, { recursive: true })
await writeFile(join(outputDirectory, "theme-gallery.svg"), `${svg}\n`)
console.log(`Generated assets/theme-gallery.svg from ${themes.length} theme files.`)
