export const LIQUIPEDIA_BASE_URL = 'https://liquipedia.net';

const USER_AGENT = 'MatchesBot/0.3 (paulaugsten9@gmail.com)';

/** How many page titles the MediaWiki API accepts per query request. */
const PAGES_PER_REQUEST = 50;

export type WikiPage = {
    title: string;
    revisions?: { '*': string }[];
};

/** Joins page titles into `|`-separated batches of at most 50 (API limit). */
export function generateBatchRequests(pages: string[]): string[] {
    const batches: string[] = [];
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const batchIndex = Math.floor(pageIndex / PAGES_PER_REQUEST);
        const page = pages[pageIndex] ?? '';
        batches[batchIndex] = batchIndex in batches ? `${batches[batchIndex]}|${page}` : page;
    }
    return batches;
}

/** Turns a Liquipedia page URL into the API page title for the given wiki. */
export function pageTitleFromUrl(url: string, wiki: string): string {
    return url.replace(`${LIQUIPEDIA_BASE_URL}/${wiki}/`, '').replaceAll('/', '%2F');
}

/**
 * Fetches raw wikitext for a batch of page titles, honoring Retry-After on
 * rate limits. Returns the API's pages map (pageId -> page).
 */
export async function fetchWikitextPages(
    wiki: string,
    batch: string,
    retries = 3,
): Promise<Record<string, WikiPage>> {
    const url = `${LIQUIPEDIA_BASE_URL}/${wiki}/api.php?action=query&prop=revisions&titles=${batch}&rvprop=content&format=json`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
        },
    });

    if (response.status === 429 && retries > 0) {
        const retryAfterMs = parseInt(response.headers.get('Retry-After') ?? '10', 10) * 1000;
        console.warn(`Rate limited, retrying after ${retryAfterMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        return fetchWikitextPages(wiki, batch, retries - 1);
    }

    if (!response.ok) {
        throw new Error(`Liquipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.query.pages;
}
