import { ApiResponse } from "mwn";
import OneOffTask from "./OneOffTask";

export default (async () => {
    const taskName = "WikiProject Philippines Indexer";
    const { log, bot } = await OneOffTask.create(taskName);

    /**
     * Pushes pages (converted into their subject page, if the given page was
     * a talk page) into a given array.
     *
     * @param array The array to push into.
     * @param res The API response.
     */
    function pushPages(array : Set<string>, res : ApiResponse) {
        Object.values(res?.query?.pages ?? []).forEach(pageObject => {
            const page = new bot.title((pageObject as Record<string, any>).title);
            const title = page.isTalkPage() ?
                page.getSubjectPage().getPrefixedText() : page.getPrefixedText();
            array.add(title);
        });
    }
    // ########################################################################
    // Class A: WikiProject template banner transclusions
    // ########################################################################

    log.info("Performing class A search...");
    const classA = new Set<string>();

    const tcCategories = [
        "Category:Top-importance Philippine-related articles",
        "Category:High-importance Philippine-related articles",
        "Category:Mid-importance Philippine-related articles",
        "Category:Low-importance Philippine-related articles",
        "Category:NA-importance Philippine-related articles",
        "Category:Unknown-importance Philippine-related articles"
    ];
    for (const category of tcCategories) {
        log.debug(`Processing "${category}"...`);
        for await (const res of bot.continuedQueryGen({
            action: "query",
            generator: "categorymembers",
            gcmtitle: category,
            gcmlimit: 500
        })) {
            pushPages(classA, res);
        }
    }
    log.info(`Found ${classA.size} Class-A articles.`);

    // ########################################################################
    // Class B: WikiProject sub-articles
    // ########################################################################

    log.info("Performing class B search...");
    const classB = new Set<string>();

    for await (const res of bot.continuedQueryGen({
        action: "query",
        generator: "prefixsearch",
        gpssearch: "Wikipedia:Tambayan Philippines",
        gpslimit: 500
    })) {
        pushPages(classB, res);
    }
    log.info(`Found ${classB.size} Class-B articles.`);

    // ########################################################################
    // Class C: Philippine-related drafts
    // ########################################################################

    log.info("Performing class C search...");
    const classC = new Set<string>();

    const searchTargets = [
        "intitle:/philippine/i",
        "intitle:/(f|p)ilipin(o|a|as)/i",
    ];

    for (const searchTarget of searchTargets) {
        log.debug(`Processing query: "${searchTarget}"`);
        for await (const res of bot.continuedQueryGen({
            action: "query",
            generator: "search",
            gsrsearch: searchTarget,
            gsrnamespace: "118",
            gsrlimit: 500
        })) {
            pushPages(classC, res);
        }
    }
    log.info(`Found ${classC.size} Class-C articles.`);

    // ########################################################################
    // Dump to file / save to Wikipedia
    // ########################################################################

    log.info("Dumping...");

    const sets = {
        "Class A": classA,
        "Class B": classB,
        "Class C": classC
    };

    for (const [name, set] of Object.entries(sets)) {
        await bot.save(
            `User:Zoomiebot/${taskName}/${name}`,
            [...set].map(p => `* {{la2|${p}}}`).join("\n"),
            `(bot) Updating [[User:Zoomiebot/${taskName}|WikiProject Tambayan Philippines]] page indexes ([[User:Zoomiebot/${taskName}#${name}|${name}]])`
        );
    }

    log.info("Done.");
    await OneOffTask.destroy(log, bot);
})();
