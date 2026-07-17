import { describe, expect, it } from 'vitest';
import { applyTheme, md, preprocessMarkdown } from './markdown';
import { makeWeChatCompatible } from './wechatCompat';

describe('makeWeChatCompatible', () => {
    it('uses durable traffic lights and one code element per source line', async () => {
        const markdown = '```javascript\nconst first = 1;\n\n// second line\n```';
        const rendered = md.render(preprocessMarkdown(markdown));
        const themed = applyTheme(rendered, 'apple');
        const compatible = await makeWeChatCompatible(themed, 'apple');
        const doc = new DOMParser().parseFromString(compatible, 'text/html');
        const block = doc.querySelector('.wechat-code-block');
        const lines = block?.querySelectorAll(':scope > section > pre > code');

        expect(block?.querySelector('.wechat-code-header')?.textContent).toBe('●●●');
        expect(lines).toHaveLength(3);
        expect(Array.from(lines || [], line => line.textContent)).toEqual([
            'const first = 1;',
            '\u00a0',
            '// second line',
        ]);
        expect(lines?.[0].querySelector('.hljs-keyword')).not.toBeNull();
        expect(lines?.[2].querySelector('.hljs-comment')).not.toBeNull();
    });
});
