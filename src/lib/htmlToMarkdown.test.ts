import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compactDataImageMarkdown, insertAtSelection } from './htmlToMarkdown';

describe('insertAtSelection', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    function createTextarea(value: string) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        return textarea;
    }

    it('inserts text using the live textarea value so concurrent typing is preserved', () => {
        const textarea = createTextarea('START\nTYPED_AFTER_UPLOAD');
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

        let nextValue = '';
        insertAtSelection(textarea, '\n![图片](data:image/png;base64,AAA)', (value) => {
            nextValue = value;
            textarea.value = value;
        });

        expect(nextValue).toBe('START\nTYPED_AFTER_UPLOAD\n![图片](data:image/png;base64,AAA)');
    });

    it('replaces the active selection and moves the caret after the inserted text', () => {
        const textarea = createTextarea('hello world');
        textarea.selectionStart = 6;
        textarea.selectionEnd = 11;

        let nextValue = '';
        insertAtSelection(textarea, 'Raphael', (value) => {
            nextValue = value;
            textarea.value = value;
        });

        expect(nextValue).toBe('hello Raphael');

        vi.runAllTimers();

        expect(textarea.selectionStart).toBe('hello Raphael'.length);
        expect(textarea.selectionEnd).toBe('hello Raphael'.length);
    });
});

describe('compactDataImageMarkdown', () => {
    const createObjectUrl = URL.createObjectURL;

    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:http://localhost/image-1');
    });

    afterEach(() => {
        URL.createObjectURL = createObjectUrl;
    });

    it('replaces inline data image markdown with a blob url', () => {
        const markdown = '![图片](data:image/png;base64,AAAA)';

        expect(compactDataImageMarkdown(markdown)).toBe('![图片](blob:http://localhost/image-1)');
    });

    it('replaces split data image markdown with a blob url', () => {
        const markdown = '![图片]\n(data:image/png;base64,AAAA)';

        expect(compactDataImageMarkdown(markdown)).toBe('![图片](blob:http://localhost/image-1)');
    });
});
