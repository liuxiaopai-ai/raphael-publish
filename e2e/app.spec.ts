import { expect, test } from '@playwright/test';

function buildLongMarkdown() {
    return Array.from({ length: 120 }, (_, index) => `## Section ${index + 1}\n\n这是第 ${index + 1} 段内容，用来验证编辑器和预览区的滚动同步是否稳定。\n\n`).join('');
}

async function waitForScrollableArea(page: import('@playwright/test').Page, testId: string) {
    await expect
        .poll(
            async () =>
                page.evaluate((id) => {
                    const element = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
                    if (!element) return -1;
                    return element.scrollHeight - element.clientHeight;
                }, testId),
            {
                timeout: 8000,
                intervals: [100, 150, 250]
            }
        )
        .toBeGreaterThan(200);
}

async function gotoApp(page: import('@playwright/test').Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
}

async function setScrollRatio(page: import('@playwright/test').Page, testId: string, ratio: number) {
    await page.evaluate(
        ([id, nextRatio]) => {
            const element = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
            if (!element) return;

            const maxScroll = element.scrollHeight - element.clientHeight;
            if (maxScroll <= 0) {
                element.scrollTop = 0;
                return;
            }

            element.scrollTop = maxScroll * nextRatio;
            element.dispatchEvent(new Event('scroll'));
        },
        [testId, ratio] as const
    );
}

async function scrollAndWaitForSync(
    page: import('@playwright/test').Page,
    sourceTestId: string,
    targetTestId: string,
    targetRatio: number
) {
    await expect
        .poll(
            async () => {
                await setScrollRatio(page, sourceTestId, targetRatio);

                return page.evaluate(([sourceId, targetId, expectedRatio]) => {
                    const source = document.querySelector(`[data-testid="${sourceId}"]`) as HTMLElement | null;
                    const target = document.querySelector(`[data-testid="${targetId}"]`) as HTMLElement | null;
                    if (!source || !target) return Number.POSITIVE_INFINITY;

                    const sourceMax = source.scrollHeight - source.clientHeight;
                    const targetMax = target.scrollHeight - target.clientHeight;
                    if (sourceMax <= 0 || targetMax <= 0) return Number.POSITIVE_INFINITY;

                    const sourceRatio = source.scrollTop / sourceMax;
                    const targetRatio = target.scrollTop / targetMax;

                    if (Math.abs(sourceRatio - expectedRatio) >= 0.06 || target.scrollTop <= 0) {
                        return Number.POSITIVE_INFINITY;
                    }

                    return Math.abs(targetRatio - expectedRatio);
                }, [sourceTestId, targetTestId, targetRatio] as const);
            },
            {
                timeout: 8000,
                intervals: [100, 150, 250]
            }
        )
        .toBeLessThan(0.12);
}

test('keeps the copy button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page);

    await page.getByTestId('tab-preview').click();
    const copyButton = page.locator('[data-testid="copy-button"]:visible');

    await expect(copyButton).toBeVisible();

    const box = await copyButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});

test('renders bold text with punctuation without leaking markdown markers', async ({ page }) => {
    await gotoApp(page);

    const editor = page.getByTestId('editor-input');
    await editor.fill('2025年初，伦敦黄金市场的一个月拆借利率一度升至**5%**。');

    const preview = page.getByTestId('preview-content');
    await expect(preview.locator('strong')).toHaveText('5%');
    await expect(preview).not.toContainText('**5%**');
    await expect(preview).toContainText('2025年初，伦敦黄金市场的一个月拆借利率一度升至5%。');
});

test('renders base64 image markdown without leaking data url text', async ({ page }) => {
    await gotoApp(page);

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    const editor = page.getByTestId('editor-input');
    await editor.fill(`# 标题\n\n![图片](${dataUrl})\n\n正文`);

    const preview = page.getByTestId('preview-content');
    const image = preview.locator('img');

    await expect(image).toHaveAttribute('src', dataUrl);
    await expect(preview).not.toContainText('data:image/png;base64');
});

test('repairs split base64 image markdown without leaking data url text', async ({ page }) => {
    await gotoApp(page);

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    const editor = page.getByTestId('editor-input');
    await editor.fill(`# 标题\n\n![图片]\n(${dataUrl})\n\n正文`);

    const preview = page.getByTestId('preview-content');
    const image = preview.locator('img');

    await expect(image).toHaveAttribute('src', dataUrl);
    await expect(preview).not.toContainText('data:image/png;base64');
});

test('compacts pasted base64 image markdown in the editor', async ({ page }) => {
    await gotoApp(page);

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    const editor = page.getByTestId('editor-input');
    await editor.focus();
    await page.evaluate((text) => {
        const textarea = document.querySelector('[data-testid="editor-input"]') as HTMLTextAreaElement;
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);
        const event = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        });
        textarea.dispatchEvent(event);
    }, `![图片]\n(${dataUrl})`);

    await expect(editor).toHaveValue(/!\[图片\]\(blob:/);
    await expect(editor).not.toHaveValue(/data:image\/png;base64/);

    const preview = page.getByTestId('preview-content');
    await expect(preview.locator('img').first()).toHaveAttribute('src', /blob:/);
});

for (const device of [
    { testId: 'device-mobile', label: 'mobile' },
    { testId: 'device-tablet', label: 'tablet' }
] as const) {
    test(`syncs editor and ${device.label} preview scrolling in both directions`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoApp(page);

        const editor = page.getByTestId('editor-input');
        await editor.fill(buildLongMarkdown());
        await page.locator(`[data-testid="${device.testId}"]:visible`).click();
        await waitForScrollableArea(page, 'editor-input');
        await waitForScrollableArea(page, 'preview-inner-scroll');

        await scrollAndWaitForSync(page, 'editor-input', 'preview-inner-scroll', 0.72);
        await scrollAndWaitForSync(page, 'preview-inner-scroll', 'editor-input', 0.28);
    });
}
