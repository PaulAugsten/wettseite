export function getRound(text: string, key: string) {
    const regex = new RegExp(`\\${key}=([^\\n|}]*)`);
    const match = text.match(regex);
    return match?.[1]?.trim() ?? null;
}

export function getGroup(text: string) {
    const regex = /=Group([^\n|}]*)/;
    const match = text.match(regex);
    return match?.[1]?.trim().at(0) ?? null;
}

export function getSubpageStage(text: string) {
    const stageTemplateMatch = text.match(/\{\{Stage\|([^}]+)\}\}/);
    const stageTemplateContent = stageTemplateMatch?.[1];
    if (stageTemplateContent) return stageTemplateContent.trim();

    if (/\{\{SwissStandings/.test(text)) return 'Phase 2 - Swiss Stage';

    const NON_STAGE_HEADINGS = new Set(['Standings', 'Results', 'Schedule', 'Overview']);
    const headingRegex = /^===([^=]+)===$/gm;
    let match = headingRegex.exec(text);
    while (match !== null) {
        const heading = match[1]?.trim();
        if (heading && !NON_STAGE_HEADINGS.has(heading)) {
            return heading;
        }
        match = headingRegex.exec(text);
    }

    return null;
}

export function getParam(text: string, key: string) {
    let regex = new RegExp(`\\|${key}=([^\\n|}]*)`);

    if (key === 'opponent1' || key === 'opponent2') {
        const templateRegex = new RegExp(`\\|${key}={{TeamOpponent\\|([^}]+)}}`);
        const templateMatch = text.match(templateRegex);

        const templateContent = templateMatch?.[1];
        if (!templateContent) return null;

        const templateParam = templateContent.match(/template=([^|}]+)/);
        const templateParamValue = templateParam?.[1];
        if (templateParamValue) {
            return templateParamValue.trim();
        }

        const parts = templateContent.split('|');
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.includes('=') && trimmed.length > 0) {
                return trimmed;
            }
        }

        const nameParam = templateContent.match(/name=([^|}\s]+)/);
        const nameParamValue = nameParam?.[1];
        if (nameParamValue) {
            return nameParamValue.trim();
        }

        return null;
    } else if (key === 'date') {
        regex = new RegExp(`\\|${key}=([^\\n|]*)`);
    } else if (key === 'Stage') {
        regex = /===\{\{Stage\|(.+?)\}\}===/;
    }

    const match = text.match(regex);
    return match?.[1]?.trim() ?? null;
}

export function wikitextSplitStages(text: string) {
    const results: string[] = [];
    const lines = text.split('\n');

    let currentStage: string[] = [];
    let insideStage = false;

    for (const line of lines) {
        if (line.trim().includes(`{{Stage`)) {
            if (insideStage && currentStage.length > 0) {
                results.push(currentStage.join('\n'));
            }

            currentStage = [line];
            insideStage = true;
            continue;
        }

        if (insideStage) {
            if (/^==([^=].*?)==$/.test(line.trim())) {
                results.push(currentStage.join('\n'));
                currentStage = [];
                insideStage = false;
                continue;
            }

            currentStage.push(line);
        }
    }

    if (results.length === 0) {
        console.log('No stages found');
        let insideResults = false;
        currentStage = [];

        for (const line of lines) {
            if (line.trim().includes(`==Results==`)) {
                insideResults = true;
                currentStage = [line];

                continue;
            }

            if (insideResults) {
                if (/^==([^=].*?)==$/.test(line.trim())) {
                    if (currentStage.length > 0) {
                        results.push(currentStage.join('\n'));
                    }
                    break;
                }

                currentStage.push(line);
            }
        }

        if (insideStage && currentStage.length > 0) {
            results.push(currentStage.join('\n'));
        }
    }

    return results;
}

export function extractCommentContent(line: string): string | null {
    const regex = /<!--\s*(.+?)\s*-->/;
    const match = line.match(regex);
    return match?.[1]?.trim() ?? null;
}
