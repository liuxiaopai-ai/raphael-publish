import { describe, expect, it } from 'vitest';
import { applyTheme, md, preprocessMarkdown } from './markdown';
import { makeWeChatCompatible } from './wechatCompat';

function renderMarkdown(markdown: string) {
    return md.render(preprocessMarkdown(markdown));
}

describe('preprocessMarkdown', () => {
    it('keeps bold rendering intact next to trailing punctuation', () => {
        const html = renderMarkdown('2025年初，伦敦黄金市场的一个月拆借利率一度升至**5%**。');

        expect(html).toContain('<strong>5%</strong>。');
        expect(html).not.toContain('**5%**');
    });

    it('repairs bold segments that start with a symbol and attach to previous text', () => {
        expect(preprocessMarkdown('至**-5%**。')).toBe('至**\u200B-5%**。');
        const html = renderMarkdown('利率变化至**-5%**。');
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const strong = doc.querySelector('strong');

        expect(strong?.textContent?.replace(/\u200B/g, '')).toBe('-5%');
    });

    it.each([
        '**A**：直接从**B**复制',
        '- **跨平台粘贴**：直接从**飞书、Notion、Word**复制',
        '**A**：**B**，**C**。',
        '**A *italic***：直接从**B**复制',
    ])('does not treat a closing bold delimiter as an opening delimiter: %s', (markdown) => {
        expect(preprocessMarkdown(markdown)).toBe(markdown);
    });

    it('still repairs a symbol-leading bold segment after another bold segment', () => {
        expect(preprocessMarkdown('**A**：利率至**-5%**。')).toBe('**A**：利率至**\u200B-5%**。');
        const html = renderMarkdown('**A**：利率至**-5%**。');
        const doc = new DOMParser().parseFromString(html, 'text/html');

        expect(Array.from(doc.querySelectorAll('strong'), node => node.textContent)).toEqual(['A', '\u200B-5%']);
    });

    it.each([
        '`**literal` 至',
        '``**literal ` code`` 至',
        '\\*\\*literal 至',
        'A** literal 至',
        '**literal\n# 至',
        '**literal\r\n# 至',
    ])('does not let literal markers consume a later bold segment: %s', (prefix) => {
        expect(preprocessMarkdown(`${prefix}**-5%**。`)).toBe(`${prefix}**\u200B-5%**。`);
    });

    it.each(['`至**-5%**。`', '``至**-5%**。 ` code``', '\\*\\*-5%\\*\\*'])('leaves code spans and escaped markers unchanged: %s', (markdown) => {
        expect(preprocessMarkdown(markdown)).toBe(markdown);
    });

    it('skips literal delimiters inside bold when pairing later segments', () => {
        const markdown = '**A `**` B**：至**-5%**。';
        expect(preprocessMarkdown(markdown)).toBe('**A `**` B**：至**\u200B-5%**。');
        const doc = new DOMParser().parseFromString(renderMarkdown(markdown), 'text/html');

        expect(doc.querySelector('code')?.textContent).toBe('**');
        expect(Array.from(doc.querySelectorAll('strong'), node => node.textContent)).toEqual(['A ** B', '\u200B-5%']);
        expect(preprocessMarkdown('**A\\*\\*B**：至**-5%**。')).toBe('**A\\*\\*B**：至**\u200B-5%**。');
    });

    it('does not merge separate bold blocks across blank lines', () => {
        const html = renderMarkdown('**5 %**\n\n**5%**');
        const doc = new DOMParser().parseFromString(html, 'text/html');

        expect(doc.querySelectorAll('strong')).toHaveLength(2);
    });
});

describe('Markdown to WeChat', () => {
    it.each([
        ['**A**：直接从**B**复制', 'p', ['A：', 'B'], 'A：直接从B复制'],
        ['- **跨平台粘贴**：直接从**飞书、Notion、Word**复制', 'li', ['跨平台粘贴：', '飞书、Notion、Word'], '跨平台粘贴：直接从飞书、Notion、Word复制'],
        ['**A**：**B**，**C**。', 'p', ['A：', 'B，', 'C。'], 'A：B，C。'],
    ])('keeps punctuation attached after rendering and conversion: %s', async (markdown, selector, boldText, text) => {
        const html = await makeWeChatCompatible(renderMarkdown(markdown), 'apple');
        const doc = new DOMParser().parseFromString(html, 'text/html');

        expect(Array.from(doc.querySelectorAll('strong'), node => node.textContent)).toEqual(boldText);
        expect(doc.querySelector(selector)?.textContent).toBe(text);
        expect(html).not.toContain('\u200B');
        expect(doc.querySelector('br')).toBeNull();
    });

    it('preserves the symbol-leading bold repair through WeChat conversion', async () => {
        const html = await makeWeChatCompatible(renderMarkdown('至**-5%**。'), 'apple');
        const doc = new DOMParser().parseFromString(html, 'text/html');

        expect(doc.querySelector('strong')?.textContent).toBe('\u200B-5%。');
        expect(doc.querySelector('p')?.textContent).toBe('至\u200B-5%。');
    });

    it('preserves legitimate zero-width joiners and non-joiners in user text', async () => {
        const markdown = '**程序员👩\u200D💻**：می\u200Cروم，与**B**复制';
        const html = await makeWeChatCompatible(renderMarkdown(markdown), 'apple');
        const doc = new DOMParser().parseFromString(html, 'text/html');

        expect(doc.querySelector('strong')?.textContent).toBe('程序员👩\u200D💻：');
        expect(doc.querySelector('p')?.textContent).toBe('程序员👩\u200D💻：می\u200Cروم，与B复制');
    });
});

describe('applyTheme', () => {
    it('groups consecutive standalone images into an image grid', () => {
        const html = '<p><img src="a.png" /></p><p><img src="b.png" /></p>';
        const themed = applyTheme(html, 'apple');
        const doc = new DOMParser().parseFromString(themed, 'text/html');
        const grid = doc.querySelector('.image-grid');

        expect(grid).not.toBeNull();
        expect(grid?.querySelectorAll('img')).toHaveLength(2);
    });

    it('keeps highlighted comments non-italic for apple', () => {
        const rawHtml = renderMarkdown('```javascript\n// 中文注释\nconst raphael = 1;\n```');
        const themed = applyTheme(rawHtml, 'apple');
        const doc = new DOMParser().parseFromString(themed, 'text/html');
        const code = doc.querySelector('pre code');
        const comment = doc.querySelector('.hljs-comment');

        expect(code?.getAttribute('style')).toContain('font-style: normal !important;');
        expect(code?.getAttribute('style')).toContain('white-space: pre;');
        expect(comment?.getAttribute('style')).toContain('font-style: normal;');
    });

    it('does not override bloomberg block-code font inheritance', () => {
        const rawHtml = renderMarkdown('```javascript\n// terminal theme\nconst raphael = 1;\n```');
        const themed = applyTheme(rawHtml, 'bloomberg');
        const doc = new DOMParser().parseFromString(themed, 'text/html');
        const container = doc.querySelector('body > div');
        const pre = doc.querySelector('pre');
        const code = doc.querySelector('pre code');

        expect(container?.getAttribute('style')).toContain('"Courier New"');
        expect(pre?.getAttribute('style')).not.toContain('font-family:');
        expect(code?.getAttribute('style')).not.toContain('font-family:');
        expect(themed).not.toContain('"SF Mono", "Cascadia Code", "Fira Code", Consolas, Menlo, Monaco, monospace');
    });
});
