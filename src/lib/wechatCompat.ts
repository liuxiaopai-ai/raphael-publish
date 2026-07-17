import { THEMES } from './themes';
import { stripIndexMarkers } from './markdownIndexer';

/**
 * Remove internal editor attributes from HTML
 * Used when exporting to avoid including internal implementation details
 *
 * This is now a thin wrapper around stripIndexMarkers from the indexing layer.
 * Keeping this function for backward compatibility.
 */
export function cleanInternalAttributes(html: string): string {
    return stripIndexMarkers(html);
}

// Helper to convert images to Base64
async function getBase64Image(imgUrl: string): Promise<string> {
    try {
        if (imgUrl.startsWith('data:')) return imgUrl;

        const response = await fetch(imgUrl, { mode: 'cors', cache: 'default' });
        if (!response.ok) return imgUrl;

        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(imgUrl);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return imgUrl;
    }
}

function appendHighlightedText(
    doc: Document,
    line: HTMLElement,
    text: string,
    ancestors: Element[]
) {
    if (!text) return;

    let node: Node = doc.createTextNode(text);
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
        const wrapper = ancestors[index].cloneNode(false) as Element;
        wrapper.appendChild(node);
        node = wrapper;
    }
    line.appendChild(node);
}

function createWechatCodeBlock(doc: Document, pre: HTMLPreElement, source: HTMLElement) {
    const wrapper = doc.createElement('section');
    wrapper.className = 'wechat-code-block';
    wrapper.setAttribute('style', pre.getAttribute('style') || '');

    const header = doc.createElement('section');
    header.className = 'wechat-code-header';
    header.setAttribute('style', 'margin-bottom: 12px; white-space: nowrap; line-height: 1;');
    [
        ['#ff5f56', '6px'],
        ['#ffbd2e', '6px'],
        ['#27c93f', '0'],
    ].forEach(([color, margin]) => {
        const dot = doc.createElement('span');
        dot.textContent = '●';
        dot.setAttribute('style', `color: ${color}; font-size: 18px; margin-right: ${margin};`);
        header.appendChild(dot);
    });

    const body = doc.createElement('section');
    const codePre = doc.createElement('pre');
    codePre.className = 'code-snippet';
    codePre.setAttribute('style', 'margin: 0; padding: 0; border: 0; background: transparent; overflow-x: auto; font: inherit;');

    const createLine = () => {
        const line = doc.createElement('code');
        Array.from(source.attributes).forEach(attribute => line.setAttribute(attribute.name, attribute.value));
        line.setAttribute('style', `${line.getAttribute('style') || ''}; display: block; white-space: pre; min-height: 1em;`);
        codePre.appendChild(line);
        return line;
    };

    let line = createLine();
    const startNewLine = () => {
        line = createLine();
    };

    const visit = (node: Node, ancestors: Element[] = []) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const parts = (node.textContent || '').split('\n');
            parts.forEach((part, index) => {
                appendHighlightedText(doc, line, part, ancestors);
                if (index < parts.length - 1) startNewLine();
            });
            return;
        }
        if (!(node instanceof Element)) return;
        if (node.tagName === 'BR') {
            startNewLine();
            return;
        }
        Array.from(node.childNodes).forEach(child => visit(child, [...ancestors, node]));
    };

    Array.from(source.childNodes).forEach(node => visit(node));

    const lines = Array.from(codePre.children) as HTMLElement[];
    const lastLine = lines[lines.length - 1];
    if (source.textContent?.endsWith('\n') && lines.length > 1 && !lastLine.textContent) {
        lastLine.remove();
    }
    Array.from(codePre.children).forEach(code => {
        if (!code.textContent) code.textContent = '\u00a0';
    });

    body.appendChild(codePre);
    wrapper.append(header, body);
    pre.replaceWith(wrapper);
}

export async function makeWeChatCompatible(html: string, themeId: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const containerStyle = theme.styles.container || '';

    // 0. Remove internal editor attributes (for click-to-locate feature)
    // These are only used in the editor and should not appear in the final HTML
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
        el.removeAttribute('data-md-type');
        el.removeAttribute('data-md-index');
    });

    // Note: We manually remove attributes here before DOM manipulation
    // The stripIndexMarkers() function is also available for HTML string operations

    // WeChat removes empty decorative spans and can collapse newline text inside one
    // <code> element. Use real glyphs and a separate <code> element for every line.
    doc.querySelectorAll('pre').forEach(pre => {
        const source = pre.querySelector(':scope > code');
        if (source instanceof HTMLElement) createWechatCodeBlock(doc, pre, source);
    });

    // 1. WeChat prefers <section> as the root wrapper for overall styling
    // If the root is a div, let's wrap or convert it to a section.
    const rootNodes = Array.from(doc.body.children);

    // Create new wrap section
    const section = doc.createElement('section');
    section.setAttribute('style', containerStyle);

    rootNodes.forEach(node => {
        // If the original html came from applyTheme it already has a root div
        // We strip it regardless of exact style string match to avoid double layers
        if (node.tagName === 'DIV' && rootNodes.length === 1) {
            Array.from(node.childNodes).forEach(child => section.appendChild(child));
        } else {
            section.appendChild(node);
        }
    });

    // 2. WeChat ignores flex in many scenarios. Convert image flex wrappers to table layout.
    const flexLikeNodes = section.querySelectorAll('div, p.image-grid');
    flexLikeNodes.forEach(node => {
        // Keep code block internals untouched.
        if (node.closest('pre, code')) return;

        const style = node.getAttribute('style') || '';
        const isFlexNode = style.includes('display: flex') || style.includes('display:flex');
        const isImageGrid = node.classList.contains('image-grid');
        if (!isFlexNode && !isImageGrid) return;

        const flexChildren = Array.from(node.children);
        if (flexChildren.every(child => child.tagName === 'IMG' || child.querySelector('img'))) {
            const table = doc.createElement('table');
            table.setAttribute('style', 'width: 100%; border-collapse: collapse; margin: 16px 0; border: none !important;');
            const tbody = doc.createElement('tbody');
            const tr = doc.createElement('tr');
            tr.setAttribute('style', 'border: none !important; background: transparent !important;');

            flexChildren.forEach(child => {
                const td = doc.createElement('td');
                td.setAttribute('style', 'padding: 0 4px; vertical-align: top; border: none !important; background: transparent !important;');
                td.appendChild(child);
                // Update child width to 100% since it's now bound by TD
                if (child.tagName === 'IMG') {
                    const currentStyle = child.getAttribute('style') || '';
                    child.setAttribute('style', currentStyle.replace(/width:\s*[^;]+;?/g, '') + ' width: 100% !important; display: block; margin: 0 auto;');
                }
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
            table.appendChild(tbody);
            node.parentNode?.replaceChild(table, node);
        } else if (isFlexNode) {
            // Non-image flex items just get stripped of flex.
            node.setAttribute('style', style.replace(/display:\s*flex;?/g, 'display: block;'));
        }
    });

    // 3. List Item Flattening
    // WeChat notoriously misrenders heavily nested <li> formatting, flattening the inner structure helps
    const listItems = section.querySelectorAll('li');
    listItems.forEach(li => {
        const hasBlockChildren = Array.from(li.children).some(child =>
            ['P', 'DIV', 'UL', 'OL', 'BLOCKQUOTE'].includes(child.tagName)
        );
        if (hasBlockChildren) {
            // We only want to clean inner tags if it's overly complex, 
            // but flattening everything might kill <strong> or <em>.
            // Let's just strip 'p' inside 'li' by replacing <p> with <span>
            const ps = li.querySelectorAll('p');
            ps.forEach(p => {
                const span = doc.createElement('span');
                span.innerHTML = p.innerHTML;
                const pStyle = p.getAttribute('style');
                if (pStyle) span.setAttribute('style', pStyle);
                p.parentNode?.replaceChild(span, p);
            });
        }
    });

    // 4. Force Inheritance
    // WeChat's editor aggressively overrides inherited fonts on <p>, <li>, etc.
    // So we manually distribute the container's font properties to all individual blocks.
    const fontMatch = containerStyle.match(/font-family:\s*([^;]+);/);
    const sizeMatch = containerStyle.match(/font-size:\s*([^;]+);/);
    const colorMatch = containerStyle.match(/color:\s*([^;]+);/);
    const lineHeightMatch = containerStyle.match(/line-height:\s*([^;]+);/);

    // We only enforce on specific text tags that WeChat likes to hijack
    const textNodes = section.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, span');
    textNodes.forEach(node => {
        // Preserve code highlighting tokens inside code blocks.
        if (node.tagName === 'SPAN' && node.closest('pre, code')) return;

        let currentStyle = node.getAttribute('style') || '';

        if (fontMatch && !currentStyle.includes('font-family:')) {
            currentStyle += ` font-family: ${fontMatch[1]};`;
        }
        if (lineHeightMatch && !currentStyle.includes('line-height:')) {
            currentStyle += ` line-height: ${lineHeightMatch[1]};`;
        }
        // Add font-size if not present (only for standard text nodes so we don't shrink headings)
        if (sizeMatch && !currentStyle.includes('font-size:') && ['P', 'LI', 'BLOCKQUOTE', 'SPAN'].includes(node.tagName)) {
            currentStyle += ` font-size: ${sizeMatch[1]};`;
        }
        if (colorMatch && !currentStyle.includes('color:')) {
            currentStyle += ` color: ${colorMatch[1]};`;
        }

        node.setAttribute('style', currentStyle.trim());
    });

    // Keep CJK punctuation attached to preceding inline emphasis in WeChat.
    // Example: <strong>标题</strong>：说明 -> <strong>标题：</strong>说明
    const inlineNodes = section.querySelectorAll('strong, b, em, span, a, code');
    inlineNodes.forEach(node => {
        const next = node.nextSibling;
        if (!next || next.nodeType !== Node.TEXT_NODE) return;
        const text = next.textContent || '';
        const match = text.match(/^\s*([：；，。！？、:])(.*)$/s);
        if (!match) return;

        const punct = match[1];
        const rest = match[2] || '';
        node.appendChild(doc.createTextNode(punct));
        if (rest) {
            next.textContent = rest;
        } else {
            next.parentNode?.removeChild(next);
        }
    });

    // 5. Convert all images to Base64 for safe WeChat pasting
    const imgs = Array.from(section.querySelectorAll('img'));
    await Promise.all(imgs.map(async img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
            const base64 = await getBase64Image(src);
            img.setAttribute('src', base64);
        }
    }));

    doc.body.innerHTML = '';
    doc.body.appendChild(section);

    // Prevent WeChat from breaking lines between inline emphasis and leading CJK punctuation.
    // Example: </strong>： should stay on the same line.
    let outputHtml = doc.body.innerHTML;
    outputHtml = outputHtml.replace(/(<\/(?:strong|b|em|span|a|code)>)\s*([：；，。！？、])/g, '$1\u2060$2');

    return outputHtml;
}
