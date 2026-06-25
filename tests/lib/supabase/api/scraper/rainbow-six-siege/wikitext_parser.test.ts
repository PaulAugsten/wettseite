import { describe, expect, it } from 'vitest';
import {
    extractCommentContent,
    getGroup,
    getParam,
    getRound,
    getSubpageStage,
} from '@/lib/supabase/api/scraper/rainbow-six-siege/wikitext_parser';

describe('getParam', () => {
    it('extracts an opponent name via the template= field', () => {
        const text = '|opponent1={{TeamOpponent|template=teamcode|score=2}}';
        expect(getParam(text, 'opponent1')).toBe('teamcode');
    });

    it('extracts an opponent name positionally when no template= field exists', () => {
        const text = '|opponent1={{TeamOpponent|TeamABC|score=2}}';
        expect(getParam(text, 'opponent1')).toBe('TeamABC');
    });

    it('extracts an opponent name via name= as a fallback', () => {
        const text = '|opponent2={{TeamOpponent|name=TeamXYZ|score=1}}';
        expect(getParam(text, 'opponent2')).toBe('TeamXYZ');
    });

    it('returns null when the opponent template is missing', () => {
        expect(getParam('|opponent1=', 'opponent1')).toBeNull();
    });

    it('extracts the date field up to the next pipe', () => {
        const text = '|date=2024-01-01 - 18:00 {{Abbr/CET}}|finished=true';
        expect(getParam(text, 'date')).toBe('2024-01-01 - 18:00 {{Abbr/CET}}');
    });

    it('extracts a Stage heading', () => {
        const text = '==={{Stage|Group Stage}}===';
        expect(getParam(text, 'Stage')).toBe('Group Stage');
    });

    it('extracts a generic key', () => {
        expect(getParam('|finished=true', 'finished')).toBe('true');
        expect(getParam('|r6esports=12345', 'r6esports')).toBe('12345');
    });
});

describe('getRound', () => {
    it('extracts the value of a header param', () => {
        expect(getRound('|header=Upper Bracket Match 1', 'header')).toBe('Upper Bracket Match 1');
    });

    it('returns null when the key is absent', () => {
        expect(getRound('|something=else', 'header')).toBeNull();
    });
});

describe('getGroup', () => {
    it('extracts the group letter from a heading', () => {
        expect(getGroup('===Group A===')).toBe('A');
        expect(getGroup('==Group B==')).toBe('B');
    });

    it('returns null when there is no group heading', () => {
        expect(getGroup('===Playoffs===')).toBeNull();
    });
});

describe('getSubpageStage', () => {
    it('extracts the stage from a {{Stage|..}} template', () => {
        expect(getSubpageStage('{{Stage|Phase 1 - Group Stage}}')).toBe('Phase 1 - Group Stage');
    });

    it('detects Swiss standings pages', () => {
        expect(getSubpageStage('{{SwissStandings|foo=bar}}')).toBe('Phase 2 - Swiss Stage');
    });

    it('falls back to the first non-generic === heading ===', () => {
        const text = '===Overview===\nSome text\n===Group A===\nMore text';
        expect(getSubpageStage(text)).toBe('Group A');
    });

    it('returns null when nothing matches', () => {
        expect(getSubpageStage('no headings here')).toBeNull();
    });
});

describe('extractCommentContent', () => {
    it('extracts the text inside a wikitext comment', () => {
        expect(extractCommentContent('<!-- Round 1 -->')).toBe('Round 1');
    });

    it('returns null when there is no comment', () => {
        expect(extractCommentContent('plain text')).toBeNull();
    });
});
