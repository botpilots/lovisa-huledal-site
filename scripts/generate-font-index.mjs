import { writeFileSync } from 'node:fs'

const METADATA_URL = 'https://fonts.google.com/metadata/fonts'
const OUTPUT_PATH = 'src/google-fonts-index.json'

const response = await fetch(METADATA_URL)
if (!response.ok) {
  throw new Error(`Failed to fetch Google Fonts metadata (${response.status})`)
}

const data = await response.json()
const index = {}

for (const family of data.familyMetadataList) {
  index[family.family.toLowerCase()] = {
    family: family.family,
    axes: family.axes?.map((axis) => ({
      tag: axis.tag,
      min: axis.min,
      max: axis.max,
    })),
    variants: family.fonts ? Object.keys(family.fonts) : [],
  }
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(index)}\n`)
console.log(`Wrote ${Object.keys(index).length} families to ${OUTPUT_PATH}`)
