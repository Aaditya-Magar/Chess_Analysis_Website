# Brilliant Chess

This project uses the MIT-licensed [Brilliant Chess](https://github.com/wdeloo/Brilliant-Chess) interface and game review workflow. Paste PGN, open a local PGN file, enter a FEN position, or choose an import source in the game form. Stockfish runs in the browser.

## Local development

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

## Production preview and Cloudflare

```sh
npm run build
npm start
```

Next.js exports the static site to `dist/`. Wrangler serves it with the same asset configuration used for deployment. To publish to your Cloudflare account, run `npx wrangler login` and `npm run deploy`.

Run `npm run lint` for source checks and `npx playwright install chromium && npm test` for the review smoke test. Set `CHESS_TEST_CHROME` to use an installed Chrome binary.

See [LICENSE](LICENSE) and [ATTRIBUTIONS](ATTRIBUTIONS) for upstream and asset credits.
