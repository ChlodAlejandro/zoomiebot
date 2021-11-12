import OneOffTask from "./OneOffTask";
import createConnection from "../database/Database";
import {RowDataPacket} from "mysql2";
import nd from "../util/nd";
import iswitch from "../util/iswitch";

(async () => {
    const { log, bot } = await OneOffTask.create("Unsourced Tambayan Pilipinas pages");

    log.info("Connecting to `enwiki_p`...");
    const sql = await createConnection(log, "enwiki");
    const [ rows ] = await sql.query<RowDataPacket[]>(`
        SELECT
            \`page_id\` AS \`id\`,
            REPLACE(\`page_title\`, "_", " ") AS \`title\`,
            DATE_FORMAT(\`rev_timestamp\`, "%Y-%m-%d %H:%i:%s") AS \`last_timestamp\`,
            \`actor_name\` AS \`last_editor\`,
            \`page_len\` AS \`len\`,
            (CASE \`cl_to\`
                WHEN "Unknown-importance_Philippine-related_articles" THEN 0
                WHEN "Low-importance_Philippine-related_articles" THEN 1
                WHEN "Mid-importance_Philippine-related_articles" THEN 2
                WHEN "High-importance_Philippine-related_articles" THEN 3
                WHEN "Top-importance_Philippine-related_articles" THEN 4
            END) AS \`importance\`
        FROM \`categorylinks\` c1
        JOIN \`page\` p1 ON \`cl_from\` = \`page_id\`
        JOIN \`revision\` ON \`page_latest\` = \`rev_id\`
        JOIN \`actor\` ON \`rev_actor\` = \`actor_id\`
        WHERE
            (\`cl_to\` = "Top-importance_Philippine-related_articles" OR
            \`cl_to\` = "High-importance_Philippine-related_articles" OR
            \`cl_to\` = "Mid-importance_Philippine-related_articles" OR
            \`cl_to\` = "Low-importance_Philippine-related_articles" OR
            \`cl_to\` = "Unknown-importance_Philippine-related_articles") AND
            (SELECT TRUE FROM \`page\` p2
            JOIN \`categorylinks\` c2 ON p2.\`page_id\` = c2.\`cl_from\`
            WHERE
                p2.\`page_namespace\` = 0 AND
                p2.\`page_title\` = p1.\`page_title\` AND
                c2.\`cl_to\` = "All_articles_lacking_sources"
            HAVING COUNT(p2.\`page_id\`))
        ORDER BY \`Importance\` DESC
    `);

    let wikitext = nd(`
        This page lists all [[Wikipedia:Tambayan Pilipinas]] pages that are tagged with {{T|Unreferenced}}. Generated on ~~~~~.
        
        {| class="wikitable sortable"
        ! rowspan=2 | Page ID
        ! rowspan=2 | Page
        ! colspan=2 | Last edit
        ! rowspan=2 | Length
        ! rowspan=2 | Importance
        |-
        ! Timestamp
        ! User
        |-
    `) + "\n";
    for (const row of rows) {
        wikitext += nd(`
            | ${row["id"]}
            | {{la3|${row["title"]}}}
            | ${row["last_timestamp"]}
            | {{u|${row["last_editor"]}}}
            | ${row["len"]}
            | {{nts|${row["importance"]}} ${
                iswitch(row["importance"], {
                    1: "Low",
                    2: "Mid",
                    3: "High",
                    4: "Top"
                }, "Unknown")
            }
            |-
        `) + "\n";
    }
    wikitext += "|}";


    // ########################################################################
    // Dump to file / save to Wikipedia
    // ########################################################################

    log.info("Dumping...");

    await bot.save(
        `User:Zoomiebot/Unsourced Tambayan Pilipinas pages/${name}`,
        wikitext,
        "(bot) Updating page list."
    );

    log.info("Done.");
    await OneOffTask.destroy(log, bot);
})();