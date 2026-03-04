import React, { useRef } from 'react';
import { Wand2, ImagePlus } from 'lucide-react';
import { handleSmartPaste, fileToDataUrl, insertAtSelection } from '../lib/htmlToMarkdown';

interface EditorPanelProps {
    markdownInput: string;
    onInputChange: (value: string) => void;
    editorScrollRef: React.RefObject<HTMLTextAreaElement>;
    onEditorScroll: () => void;
    scrollSyncEnabled: boolean;
}

export default function EditorPanel({ markdownInput, onInputChange, editorScrollRef, onEditorScroll, scrollSyncEnabled }: EditorPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        handleSmartPaste(e, markdownInput, onInputChange);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        const textarea = editorScrollRef.current;
        if (!textarea) return;

        Promise.all(files.map(fileToDataUrl))
            .then((dataUrls) => {
                const markdownImages = dataUrls
                    .filter(Boolean)
                    .map((src, index) => `![图片${files.length > 1 ? ` ${index + 1}` : ''}](${src})`)
                    .join('\n\n');
                if (!markdownImages) return;
                insertAtSelection(textarea, markdownInput, markdownImages, onInputChange);
            })
            .catch((err) => {
                console.error('Image upload failed:', err);
                alert('图片上传失败，请重试');
            })
            .finally(() => {
                // 重置 input，允许重复选同一文件
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
    };

    return (
        <div className="border-r border-[#00000015] dark:border-[#ffffff15] flex flex-col relative z-30 bg-transparent flex-1 min-h-0">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
            />
            <textarea
                ref={editorScrollRef}
                className="w-full flex-1 p-8 md:p-10 resize-none bg-transparent outline-none font-mono text-[15px] md:text-[16px] leading-[1.8] no-scrollbar text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#6e6e73]"
                value={markdownInput}
                onChange={(e) => onInputChange(e.target.value)}
                onPaste={onPaste}
                onScroll={scrollSyncEnabled ? onEditorScroll : undefined}
                placeholder="在这里输入 Markdown 内容..."
                spellCheck={false}
            />

            {/* Bottom Action / Info Bar for Editor */}
            <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-[#00000010] dark:border-[#ffffff10] bg-[#fbfbfd]/50 dark:bg-[#1c1c1e]/50 backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                    <Wand2 size={14} className="text-[#0066cc] dark:text-[#0a84ff] shrink-0" />
                    <span className="text-[12.5px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <span className="hidden sm:inline">支持直接粘贴 <span className="text-[#86868b] dark:text-[#a1a1a6]">飞书、Notion或Word等</span> 富文本，自动净化为 Markdown</span>
                        <span className="sm:hidden">支持直接粘贴 <span className="text-[#86868b] dark:text-[#a1a1a6]">飞书、Notion或Word等</span> 富文本，自动转化</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title="插入图片"
                        className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0066cc] dark:text-[#0a84ff] hover:opacity-70 transition-opacity"
                    >
                        <ImagePlus size={14} />
                        <span className="hidden sm:inline">插入图片</span>
                    </button>
                    <div className="text-[12px] font-mono text-[#86868b] dark:text-[#a1a1a6]">
                        {markdownInput.length} 字
                    </div>
                </div>
            </div>
        </div>
    );
}
