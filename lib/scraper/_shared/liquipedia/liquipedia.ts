const LIQUIPEDIA_BASE_URL = 'https://liquipedia.net';

const USER_AGENT = 'MatchesBot/1.1 (paulaugsten9@gmail.com)';

const PAGES_PER_REQUEST = 50;

const MIN_REQUEST_GAP_MS = 2_000;
const MIN_PARSE_GAP_MS = 30_000;

let lastRequestAt = 0;
let lastParseAt = 0;

let pendingRequest: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Queues a request behind every other one, waiting out the rate limit.
 */
async function throttledFetch(url: string, isParse: boolean, retries: number): Promise<Response> {
    const request = pendingRequest.then(async () => {
        for (let attempt = 0; ; attempt++) {
            const readyAt = Math.max(
                lastRequestAt + MIN_REQUEST_GAP_MS,
                isParse ? lastParseAt + MIN_PARSE_GAP_MS : 0,
            );
            const waitMs = readyAt - Date.now();
            if (waitMs > 0) {
                await sleep(waitMs);
            }

            lastRequestAt = Date.now();
            if (isParse) {
                lastParseAt = lastRequestAt;
            }

            const response = await fetch(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'application/json',
                },
            });

            if (response.status !== 429 || attempt >= retries) {
                return response;
            }

            const retryAfterMs = parseInt(response.headers.get('Retry-After') ?? '10', 10) * 1000;
            console.warn(`Rate limited, retrying after ${retryAfterMs}ms...`);
            await sleep(retryAfterMs);
        }
    });

    // Keep the queue alive so one failure doesn't reject every later request.
    pendingRequest = request.catch(() => undefined);
    return request;
}

/**
 * Fetches raw wikitext for a batch of page titles.
 */
export async function fetchWikitextPages(
    wiki: string,
    batch: string,
    retries = 3,
): Promise<Record<string, WikiPage>> {
    const url = `${LIQUIPEDIA_BASE_URL}/${wiki}/api.php?action=query&prop=revisions&titles=${batch}&rvprop=content&format=json`;

    const response = await throttledFetch(url, false, retries);
    if (!response.ok) {
        throw new Error(`Liquipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.query.pages;
}

/**
 * Fetches a page's rendered HTML via `action=parse`.
 */
export async function fetchParsedHtml(
    wiki: string,
    pageTitle: string,
    retries = 3,
): Promise<string> {
    const url = `${LIQUIPEDIA_BASE_URL}/${wiki}/api.php?action=parse&page=${pageTitle}&prop=text&format=json`;

    const response = await throttledFetch(url, true, retries);
    if (!response.ok) {
        throw new Error(`Liquipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(
            `Liquipedia API error for "${pageTitle}": ${data.error.info ?? data.error.code}`,
        );
    }

    const html = data.parse?.text?.['*'];
    if (typeof html !== 'string') {
        throw new Error(`Liquipedia returned no parsed content for "${pageTitle}"`);
    }
    return html;
}
