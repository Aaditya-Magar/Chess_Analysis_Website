import { copyFile, mkdir, readdir } from 'node:fs/promises'
const source = new URL('../node_modules/stockfish/', import.meta.url)
const target = new URL('../public/engine/', import.meta.url)
await mkdir(target, { recursive: true })
const files = (await readdir(new URL('bin/', source))).filter(name => /-lite-single\.(js|wasm)$/.test(name))
for (const name of files) await copyFile(new URL('bin/' + name, source), new URL(name, target))
await copyFile(new URL('Copying.txt', source), new URL('LICENSE.txt', target))
