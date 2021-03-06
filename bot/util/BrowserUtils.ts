import puppeteer, {Browser} from "puppeteer";
import Zoomiebot from "../Zoomiebot";
import ZoomiebotCache from "./ZoomiebotCache";

/**
 * Utilities for doing things with a browser. Helps with rendering HTML, among other things.
 */
export default class BrowserUtils {

    /**
     * Set to true if a browser is currently launching. Prevents `assertBrowser` from
     * being called too fast (which will cause memory usage issues).
     *
     * @private
     */
    private static launching: boolean;

    /**
     * The Puppeteer browser handling this class.
     */
    static browser: Browser;

    /**
     * Stores rendered images for caching. Automatically pruned.
     */
    static renderCache: ZoomiebotCache = new ZoomiebotCache();

    /**
     * Ensures that `.browser` is populated with a Puppeteer browser.
     */
    static async assertBrowser(): Promise<void> {
        if (this.browser == null || !this.browser.isConnected()) {
            if (this.launching) {
                await new Promise<void>( (res) => {
                    const i = setInterval(() => {
                        if (!this.launching) {
                            res();
                        }
                        clearInterval(i);
                    }, 20);
                });
                return;
            } else {
                this.launching = true;
            }

            this.browser = await puppeteer.launch();
            Zoomiebot.i.log.info("BrowserUtils started.");
            this.launching = false;
        }
    }

    /**
     * Closes the browser.
     */
    static async closeBrowser(): Promise<void> {
        await this.browser.close();
    }

    /**
     * Renders a diff given some settings
     *
     * @param wikiIndex The index URL of the wiki
     * @param to The revision ID to render.
     * @param options Extra options
     */
    static async renderVisualDiff(
        wikiIndex: string,
        to: number,
        options: { from?: number, mode?: "visual" | "source" } = {}
    ): Promise<Buffer> {
        const i = Math.random().toString().substring(2, 8);
        await this.assertBrowser();

        const targetURL = new URL(wikiIndex);

        const mode = options.mode ?? "visual";
        targetURL.searchParams.set("diff", `${to}`);
        targetURL.searchParams.set("diffmode", `${mode}`);
        if (options.from)
            targetURL.searchParams.set("oldid", `${options.from}`);

        const cacheKey = `browserUtils::diffRender++${
            Buffer.from(targetURL.toString()).toString("base64")
        }`;
        if (this.renderCache.has(cacheKey)) {
            Zoomiebot.i.log.debug(`[R:${i}] Cache hit!`);
            return this.renderCache.get<Buffer>(cacheKey);
        } else {
            Zoomiebot.i.log.debug(`[R:${i}] Rendering diff: ${targetURL.toString()}`);
        }

        const page = await this.browser.newPage();
        try {
            await page.setViewport({
                width: 1366,
                height: 768,
                deviceScaleFactor: 2
            });
            await page.goto(targetURL.toString());
            Zoomiebot.i.log.debug(`[R:${i}] Navigated to page...`);
        } catch (e) {
            await page.close();
        }

        let targetSelector = mode === "visual"
            ? ".ve-ui-diffElement"
            : "table.diff";

        try {
            await page.waitForSelector(targetSelector, { timeout: 10000 });
        } catch (e) {
            console.error(e);
            targetSelector = "#content";
        }
        const element = await page.$(targetSelector);

        // Element still not found. Give up.
        if (element == null) {
            return null;
        }

        const screenshotImage = await element.screenshot() as Buffer;
        await page.close();

        Zoomiebot.i.log.debug(`[R:${i}] Rendered!`);
        this.renderCache.put(cacheKey, screenshotImage);

        return screenshotImage;
    }

}
