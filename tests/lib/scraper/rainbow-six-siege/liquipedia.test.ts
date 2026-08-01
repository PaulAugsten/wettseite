import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateBatchRequests } from '@/lib/scraper/_shared/liquipedia/liquipedia';

describe('generateBatchRequests', () => {
    it('batches pages into groups of 50 joined by |', () => {
        const pages = Array.from({ length: 3 }, (_, i) => `Page_${i}`);
        expect(generateBatchRequests(pages)).toEqual(['Page_0|Page_1|Page_2']);
    });

    it('starts a new batch every 50 pages', () => {
        const pages = Array.from({ length: 51 }, (_, i) => `Page_${i}`);
        const batches = generateBatchRequests(pages);
        expect(batches).toHaveLength(2);
        expect(batches[1]).toBe('Page_50');
    });
});

describe('liquipedia API client', () => {
    const fetchMock = vi.fn();

    /**
     * The rate limiter keeps its clocks and request queue in module scope, so
     * every test needs its own instance to start from an unthrottled state.
     */
    async function loadClient() {
        vi.resetModules();
        return import('@/lib/scraper/_shared/liquipedia/liquipedia');
    }

    function apiResponse(
        body: unknown,
        init: { ok?: boolean; status?: number; statusText?: string; retryAfter?: string } = {},
    ) {
        return {
            ok: init.ok ?? true,
            status: init.status ?? 200,
            statusText: init.statusText ?? 'OK',
            headers: {
                get: (name: string) => (name === 'Retry-After' ? (init.retryAfter ?? null) : null),
            },
            json: async () => body,
        } as unknown as Response;
    }

    beforeEach(() => {
        vi.useFakeTimers();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('fetchWikitextPages', () => {
        it('returns the page map and identifies itself to the API', async () => {
            const { fetchWikitextPages } = await loadClient();
            const pages = { '1': { title: 'Page_A', revisions: [{ '*': '{{Match}}' }] } };
            fetchMock.mockResolvedValue(apiResponse({ query: { pages } }));

            const request = fetchWikitextPages('rainbowsix', 'Page_A|Page_B');
            await vi.runAllTimersAsync();

            await expect(request).resolves.toEqual(pages);

            const [url, init] = fetchMock.mock.calls[0]!;
            expect(url).toContain('/rainbowsix/api.php?action=query');
            expect(url).toContain('titles=Page_A|Page_B');
            expect(init.headers['User-Agent']).toContain('MatchesBot');
        });

        it('throws on a non-ok response', async () => {
            const { fetchWikitextPages } = await loadClient();
            fetchMock.mockResolvedValue(
                apiResponse({}, { ok: false, status: 503, statusText: 'Service Unavailable' }),
            );

            const request = fetchWikitextPages('rainbowsix', 'Page_A');
            const rejects = expect(request).rejects.toThrow(
                'Liquipedia API error: 503 Service Unavailable',
            );
            await vi.runAllTimersAsync();
            await rejects;
        });

        it('retries a 429 once the Retry-After delay has passed', async () => {
            const { fetchWikitextPages } = await loadClient();
            fetchMock
                .mockResolvedValueOnce(apiResponse({}, { ok: false, status: 429, retryAfter: '5' }))
                .mockResolvedValueOnce(apiResponse({ query: { pages: {} } }));

            const request = fetchWikitextPages('rainbowsix', 'Page_A', 1);
            await vi.runAllTimersAsync();

            await expect(request).resolves.toEqual({});
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('surfaces the 429 once the retry budget is spent', async () => {
            const { fetchWikitextPages } = await loadClient();
            fetchMock.mockResolvedValue(
                apiResponse(
                    {},
                    { ok: false, status: 429, statusText: 'Too Many Requests', retryAfter: '5' },
                ),
            );

            const request = fetchWikitextPages('rainbowsix', 'Page_A', 0);
            const rejects = expect(request).rejects.toThrow('Liquipedia API error: 429');
            await vi.runAllTimersAsync();
            await rejects;

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('holds consecutive requests to one per two seconds', async () => {
            const { fetchWikitextPages } = await loadClient();
            fetchMock.mockResolvedValue(apiResponse({ query: { pages: {} } }));

            const first = fetchWikitextPages('rainbowsix', 'Page_A');
            await vi.runAllTimersAsync();
            await first;
            expect(fetchMock).toHaveBeenCalledTimes(1);

            const second = fetchWikitextPages('rainbowsix', 'Page_B');
            await vi.advanceTimersByTimeAsync(1_000);
            expect(fetchMock).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(1_500);
            await second;
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('keeps the queue running after a failed request', async () => {
            // A rejection must not poison the shared promise chain every later
            // request is queued behind.
            const { fetchWikitextPages } = await loadClient();
            fetchMock
                .mockResolvedValueOnce(apiResponse({}, { ok: false, status: 500 }))
                .mockResolvedValueOnce(apiResponse({ query: { pages: { '1': {} } } }));

            const failing = fetchWikitextPages('rainbowsix', 'Page_A');
            const rejects = expect(failing).rejects.toThrow('Liquipedia API error: 500');
            await vi.runAllTimersAsync();
            await rejects;

            const second = fetchWikitextPages('rainbowsix', 'Page_B');
            await vi.runAllTimersAsync();

            await expect(second).resolves.toEqual({ '1': {} });
        });
    });

    describe('fetchParsedHtml', () => {
        const parsed = { parse: { text: { '*': '<div>tournament</div>' } } };

        it('returns the rendered HTML for a page', async () => {
            const { fetchParsedHtml } = await loadClient();
            fetchMock.mockResolvedValue(apiResponse(parsed));

            const request = fetchParsedHtml('rainbowsix', 'Six_Major');
            await vi.runAllTimersAsync();

            await expect(request).resolves.toBe('<div>tournament</div>');
            expect(fetchMock.mock.calls[0]?.[0]).toContain('action=parse&page=Six_Major');
        });

        it('holds action=parse requests to one per 30 seconds', async () => {
            // action=parse is rate limited far more aggressively than the query
            // API; exceeding it gets the bot banned rather than throttled.
            const { fetchParsedHtml } = await loadClient();
            fetchMock.mockResolvedValue(apiResponse(parsed));

            const first = fetchParsedHtml('rainbowsix', 'Page_A');
            await vi.runAllTimersAsync();
            await first;
            expect(fetchMock).toHaveBeenCalledTimes(1);

            const second = fetchParsedHtml('rainbowsix', 'Page_B');
            await vi.advanceTimersByTimeAsync(29_000);
            expect(fetchMock).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(2_000);
            await second;
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('throws on a non-ok response', async () => {
            const { fetchParsedHtml } = await loadClient();
            fetchMock.mockResolvedValue(
                apiResponse({}, { ok: false, status: 500, statusText: 'Internal Server Error' }),
            );

            const request = fetchParsedHtml('rainbowsix', 'Six_Major');
            const rejects = expect(request).rejects.toThrow(
                'Liquipedia API error: 500 Internal Server Error',
            );
            await vi.runAllTimersAsync();
            await rejects;
        });

        it('throws when the API reports an error in an otherwise ok response', async () => {
            const { fetchParsedHtml } = await loadClient();
            fetchMock.mockResolvedValue(
                apiResponse({ error: { code: 'missingtitle', info: 'The page does not exist' } }),
            );

            const request = fetchParsedHtml('rainbowsix', 'Nope');
            const rejects = expect(request).rejects.toThrow(
                'Liquipedia API error for "Nope": The page does not exist',
            );
            await vi.runAllTimersAsync();
            await rejects;
        });

        it('throws when the response carries no parsed text', async () => {
            const { fetchParsedHtml } = await loadClient();
            fetchMock.mockResolvedValue(apiResponse({ parse: {} }));

            const request = fetchParsedHtml('rainbowsix', 'Six_Major');
            const rejects = expect(request).rejects.toThrow(
                'Liquipedia returned no parsed content for "Six_Major"',
            );
            await vi.runAllTimersAsync();
            await rejects;
        });
    });
});
