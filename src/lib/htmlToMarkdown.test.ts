import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSmartPaste, insertAtSelection } from './htmlToMarkdown';

describe('insertAtSelection', () => {
    const originalCreateObjectURL = URL.createObjectURL;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
        URL.createObjectURL = originalCreateObjectURL;
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

    it('pastes clipboard images as blob object URLs', async () => {
        const textarea = createTextarea('hello ');
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

        const file = new File(['png'], 'clip.png', { type: 'image/png' });
        const setMarkdownInput = vi.fn((value: string) => {
            textarea.value = value;
        });
        URL.createObjectURL = vi.fn(() => 'blob:http://localhost/pasted-image') as typeof URL.createObjectURL;

        const event = {
            clipboardData: {
                items: [
                    {
                        kind: 'file',
                        type: 'image/png',
                        getAsFile: () => file
                    }
                ],
                files: [file],
                getData: vi.fn(() => '')
            },
            currentTarget: textarea,
            preventDefault: vi.fn()
        } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;

        handleSmartPaste(event, setMarkdownInput);
        await Promise.resolve();
        vi.runAllTimers();

        expect(event.preventDefault).toHaveBeenCalled();
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
        expect(setMarkdownInput).toHaveBeenCalledWith('hello ![图片](blob:http://localhost/pasted-image)');
        expect(textarea.selectionStart).toBe(textarea.value.length);
        expect(textarea.selectionEnd).toBe(textarea.value.length);
    });
});
