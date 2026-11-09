import { Plugin, Theme } from "@opencode/plugin/gui"
import aurumTide from "./themes/aurum-tide.json"
import bloodFrost from "./themes/blood-frost.json"
import emberwave from "./themes/emberwave.json"
import midnightEarth from "./themes/midnight-earth.json"
import pineFrost from "./themes/pine-frost.json"
import rusticWinter from "./themes/rustic-winter.json"
import slateMist from "./themes/slate-mist.json"
import thirteenGrove from "./themes/thirteen-grove.json"
import velvetTide from "./themes/velvet-tide.json"

const themes = [
  aurumTide,
  bloodFrost,
  emberwave,
  midnightEarth,
  pineFrost,
  rusticWinter,
  slateMist,
  thirteenGrove,
  velvetTide,
]

export default Plugin.define({
  setup(ctx) {
    for (const theme of themes) ctx.add(Theme, theme)
  },
})
