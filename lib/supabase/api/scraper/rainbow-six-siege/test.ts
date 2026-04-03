import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
    const url =
        'https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=BLAST_Major/2023/Stage_2&rvprop=content&format=json';

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'MatchesBot/0.3 (paulaugsten9@gmail.com)',
        },
    });
    const $ = cheerio.load(data);

    const pages = data.query.pages;

    for (const pageId in data.query.pages) {
        const page = pages[pageId];
        const wikitext = page.revisions[0]['*'];
        console.log(`Page: ${page.title}`);
        console.log(`Wikitext: ${wikitext}`);
    }
}

test();
