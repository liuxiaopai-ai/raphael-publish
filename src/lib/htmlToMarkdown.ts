import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined'
});

turndownService.use(gfm);

// Rule to optimize images
turndownService.addRule('image', {
    filter: 'img',
    replacement: (_content, node: any) => {
        const alt = node.alt || '图片';
        const src = (node.getAttribute?.('src') || node.src || '').trim();
        const title = (node.title || '').replace(/"/g, '\\"');

        if (!src) return '';

        // Preserve full data URLs. Truncating them produces broken pasted images.
        return `![${alt}](${src}${title ? ` "${title}"` : ''})\n`;
    }
});

function isIDEFormattedHTML(htmlData: string, textData: string): boolean {
    if (!htmlData || !textData) return false;

    const ideSignatures = [
        /<meta\s+charset=['"]utf-8['"]/i,
        /<div\s+class=["']ace_line["']/,
        /style=["'][^"']*font-family:\s*['"]?(?:Consolas|Monaco|Menlo|Courier)/i,
        (html: string) => {
            const hasDivSpan = /<(?:div|span)[\s>]/.test(html);
            const hasSemanticTags = /<(?:p|h[1-6]|strong|em|ul|ol|li|blockquote)[\s>]/i.test(html);
            return hasDivSpan && !hasSemanticTags;
        },
        (html: string) => {
            const strippedHtml = html.replace(/<[^>]+>/g, '').trim();
            return strippedHtml === textData.trim();
        }
    ];

    let matchCount = 0;
    for (const signature of ideSignatures) {
        if (typeof signature === 'function') {
            if (signature(htmlData)) matchCount++;
        } else if (signature.test(htmlData)) {
            matchCount++;
        }
    }
    return matchCount >= 2;
}

function isMarkdown(text: string): boolean {
    if (!text) return false;
    const patterns = [
        /^#{1,6}\s+/m,
        /\*\*[^*]+\*\*/,
        /\*[^*\n]+\*/,
        /\[[^\]]+\]\([^)]+\)/,
        /!\[[^\]]*\]\([^)]+\)/,
        /^[\*\-\+]\s+/m,
        /^\d+\.\s+/m,
        /^>\s+/m,
        /`[^`]+`/,
        /```[\s\S]*?```/,
        /^\|.*\|$/m,
        /<!--.*?-->/,
        /^---+$/m
    ];
    return patterns.filter(pattern => pattern.test(text)).length >= 2;
}

function getClipboardImageFiles(clipboardData: DataTransfer): File[] {
    const fromItems = Array.from(clipboardData.items || [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

    if (fromItems.length > 0) return fromItems;

    return Array.from(clipboardData.files || []).filter((file) => file.type.startsWith('image/'));
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read clipboard image'));
        reader.readAsDataURL(file);
    });
}

export function insertAtSelection(
    textarea: HTMLTextAreaElement,
    insertedText: string,
    setMarkdownInput: (val: string) => void
) {
    const currentValue = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = currentValue.substring(0, start) + insertedText + currentValue.substring(end);
    setMarkdownInput(newValue);

    setTimeout(() => {
        const nextPos = start + insertedText.length;
        textarea.selectionStart = textarea.selectionEnd = nextPos;
        textarea.focus();
    }, 0);
}

export function handleSmartPaste(
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    setMarkdownInput: (val: string) => void
): void {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    const imageFiles = getClipboardImageFiles(clipboardData);

    if (imageFiles.length > 0) {
        e.preventDefault();
        const textarea = e.currentTarget;

        Promise.all(imageFiles.map(fileToDataUrl))
            .then((dataUrls) => {
                const markdownImages = dataUrls
                    .filter(Boolean)
                    .map((src, index) => `![图片${dataUrls.length > 1 ? ` ${index + 1}` : ''}](${src})`)
                    .join('\n\n');

                if (!markdownImages) return;
                insertAtSelection(textarea, markdownImages, setMarkdownInput);
            })
            .catch((err) => {
                console.error('Clipboard image conversion failed:', err);
                alert('粘贴图片失败，请重试');
            });
        return;
    }

    if (textData && /^\[Image\s*#?\d*\]$/i.test(textData.trim())) {
        e.preventDefault();
        return;
    }

    const isFromIDE = isIDEFormattedHTML(htmlData, textData);
    if (isFromIDE && textData && isMarkdown(textData)) {
        return;
    }

    if (htmlData && htmlData.trim() !== '') {
        const hasPreTag = /<pre[\s>]/.test(htmlData);
        const hasCodeTag = /<code[\s>]/.test(htmlData);
        const isMainlyCode = (hasPreTag || hasCodeTag) && !htmlData.includes('<p') && !htmlData.includes('<div');

        if (isMainlyCode) {
            return;
        }

        if (htmlData.includes('file:///') || htmlData.includes('src="file:')) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        try {
            let markdown = turndownService.turndown(htmlData);
            markdown = markdown.replace(/\n{3,}/g, '\n\n');

            const textarea = e.currentTarget;
            insertAtSelection(textarea, markdown, setMarkdownInput);
        } catch (err) {
            console.error('HTML to Markdown conversion failed:', err);
            // Fallback to text
            const textarea = e.currentTarget;
            insertAtSelection(textarea, textData, setMarkdownInput);
        }
    } else if (textData && isMarkdown(textData)) {
        return;
    }
}
