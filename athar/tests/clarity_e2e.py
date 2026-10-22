import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

root = Path(__file__).resolve().parents[1]
html = (root / "index.html").read_text()
html = re.sub(r'<link[^>]+>', "", html)
html = re.sub(r'<script type="module"[^>]*></script>', "", html)
css = (root / "assets/styles.css").read_text() + "\n" + (root / "assets/clarity.css").read_text()
html = html.replace("</head>", f"<style>{css}</style></head>")
core = re.sub(r"\bexport\s+(?=(?:const|function)\b)", "", (root / "assets/core.js").read_text())
app = (root / "assets/app.js").read_text()
app = re.sub(r"""^import\s+\{[^\n]+\}\s+from\s+['"]\.\/core\.js['"];?""", "", app)
bundle = core + "\nconst h=escapeHtml;\n" + app

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for width, height, name in [(1440, 950, "desktop"), (390, 844, "mobile"), (768, 1024, "tablet")]:
            page = await browser.new_page(viewport={"width": width, "height": height})
            errors = []
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            await page.set_content(html)
            await page.add_script_tag(content=bundle)
            await page.locator(".hero-story").wait_for()
            assert "ATHAR prépare le rapport" in await page.locator("h1").inner_text()
            assert not await page.evaluate("document.documentElement.scrollWidth > innerWidth")
            await page.locator('button[data-action="hero-mode"][data-index="1"]').click()
            assert await page.locator(".story-field-value").inner_text() == "Léger encrassement"
            await page.locator('button[data-action="hero-mode"][data-index="2"]').click()
            assert await page.locator(".story-field-value").inner_text() == "Non renseignée"
            await page.locator(".story-deep-link").click()
            assert await page.locator(".step-content h2").count() > 0
            assert not errors, f"{name}: {errors}"
            print(f"{name}: OK — no JS errors, responsive or interaction failures")
            await page.close()
        await browser.close()

asyncio.run(check())
