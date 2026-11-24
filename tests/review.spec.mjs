import { expect, test } from "@playwright/test"

const pgn = '[White "White Player"]\n[Black "Black Player"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1'

test("static export reviews pasted PGN and navigates on desktop", async ({ page }) => {
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.goto("/")
    const input = page.getByRole("textbox", { name: "Paste your PGN code here" })
    await expect(input).toHaveValue("")
    await input.fill("1. invalid")
    await page.getByRole("button", { name: "Analyze", exact: true }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Error reading PGN" })).toContainText("Error reading PGN")
    await input.fill(pgn)
    await page.getByRole("button", { name: "Analyze", exact: true }).click()
    await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true", { timeout: 30000 })
    await page.getByRole("button", { name: "Last move" }).filter({ visible: true }).click()
    await expect(page.getByRole("tab", { name: "Moves" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByText("Qh4#", { exact: true }).first()).toBeVisible()
    await page.getByRole("button", { name: "First position" }).filter({ visible: true }).click()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByText("f3", { exact: true }).first()).toBeVisible()
    expect(errors).toEqual([])
})

test("uploaded PGN reviews on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    const upload = page.getByLabel("Open PGN file")
    await expect(upload).toBeVisible()
    await page.getByRole("button", { name: "Game format: PGN" }).click()
    await expect(page.getByText("Analysis Type")).toHaveCount(0)
    await page.getByRole("button", { name: "FEN", exact: true }).click()
    await expect(upload).toHaveCount(0)
    await page.getByRole("button", { name: "Game format: FEN" }).click()
    await page.getByRole("button", { name: "PGN", exact: true }).click()
    await upload.setInputFiles({
        name: "game.pgn",
        mimeType: "text/plain",
        buffer: Buffer.from(pgn),
    })
    await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true", { timeout: 30000 })
    await page.getByRole("button", { name: "Next move" }).filter({ visible: true }).click()
    await expect(page.getByRole("tab", { name: "Moves" })).toHaveAttribute("aria-selected", "true")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("cancels an analysis while the engine loads and retries", async ({ page }) => {
    let release
    const engineReady = new Promise(resolve => { release = resolve })
    await page.route("**/engine/stockfish-19-lite-single.wasm", async route => {
        await engineReady
        await route.continue()
    })
    try {
        await page.goto("/")
        const input = page.getByRole("textbox", { name: "Paste your PGN code here" })
        await input.fill(pgn)
        await page.getByRole("button", { name: "Analyze", exact: true }).click()
        await page.getByRole("button", { name: "Cancel", exact: true }).click()
        await expect(input).toBeVisible()
        release()
        await input.fill(pgn)
        await page.getByRole("button", { name: "Analyze", exact: true }).click()
        await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true", { timeout: 30000 })
    } finally {
        release()
    }
})
