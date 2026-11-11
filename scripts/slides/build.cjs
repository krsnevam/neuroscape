/**
 * Builds the Unit 5 lecture decks into public/slides: a .pptx to download and a .json the app renders.
 *   npm run slides            all decks
 *   npm run slides -- L35     one deck
 */
const fs = require('node:fs')
const path = require('node:path')
const { buildDeck, buildScene } = require('./lib.cjs')

const only = process.argv.slice(2)
const outDir = process.env.SLIDES_OUT ?? path.join(__dirname, '..', '..', 'public', 'slides')
const deckDir = path.join(__dirname, 'decks')

;(async () => {
  fs.mkdirSync(outDir, { recursive: true })
  const files = fs.readdirSync(deckDir).filter((f) => f.endsWith('.cjs')).sort()
  for (const f of files) {
    const deck = require(path.join(deckDir, f))
    if (only.length && !only.includes(deck.code)) continue
    const out = await buildDeck(deck, outDir)
    // the same deck as drawing operations, for the in-app viewer
    fs.writeFileSync(path.join(outDir, `${deck.code}.json`), JSON.stringify(buildScene(deck)))
    console.log(`${deck.code}: ${deck.slides.length} slides -> ${path.relative(process.cwd(), out)}`)
  }
})()
