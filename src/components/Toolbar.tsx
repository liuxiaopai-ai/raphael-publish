import { Copy, CheckCircle2, Download, Smartphone, Tablet, Monitor, Loader2, Link2, Unlink2, Columns2, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { motion } from 'framer-motion';

interface ToolbarProps {
    previewDevice: 'mobile' | 'tablet' | 'pc';
    desktopPreviewMode: 'split' | 'drawer';
    desktopPreviewOpen: boolean;
    onDeviceChange: (device: 'mobile' | 'tablet' | 'pc') => void;
    onDesktopPreviewModeChange: (mode: 'split' | 'drawer') => void;
    onToggleDesktopPreview: () => void;
    onExportPdf: () => void;
    onExportHtml: () => void;
    onCopy: () => void;
    copied: boolean;
    isCopying: boolean;
    scrollSyncEnabled: boolean;
    onToggleScrollSync: () => void;
}

export default function Toolbar({
    previewDevice,
    desktopPreviewMode,
    desktopPreviewOpen,
    onDeviceChange,
    onDesktopPreviewModeChange,
    onToggleDesktopPreview,
    onExportPdf,
    onExportHtml,
    onCopy,
    copied,
    isCopying,
    scrollSyncEnabled,
    onToggleScrollSync
}: ToolbarProps) {
    return (
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 max-w-[1024px]">
            <div className="hidden md:flex items-center gap-3">
                <div className="flex bg-[#00000008] dark:bg-[#ffffff10] p-1 rounded-full backdrop-blur-md">
                    <button
                        data-testid="device-mobile"
                        onClick={() => onDeviceChange('mobile')}
                        className={`p-2 rounded-full transition-all ${previewDevice === 'mobile' ? 'bg-white dark:bg-[#2c2c2e] shadow-sm' : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'}`}
                        title="手机视图 (480px)"
                    >
                        <Smartphone size={16} />
                    </button>
                    <button
                        data-testid="device-tablet"
                        onClick={() => onDeviceChange('tablet')}
                        className={`p-2 rounded-full transition-all ${previewDevice === 'tablet' ? 'bg-white dark:bg-[#2c2c2e] shadow-sm' : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'}`}
                        title="平板视图 (768px)"
                    >
                        <Tablet size={16} />
                    </button>
                    <button
                        data-testid="device-pc"
                        onClick={() => onDeviceChange('pc')}
                        className={`p-2 rounded-full transition-all ${previewDevice === 'pc' ? 'bg-white dark:bg-[#2c2c2e] shadow-sm' : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'}`}
                        title="桌面视图 (PC)"
                    >
                        <Monitor size={16} />
                    </button>
                </div>

                <div className="flex bg-[#00000008] dark:bg-[#ffffff10] p-1 rounded-full backdrop-blur-md">
                    <button
                        data-testid="desktop-layout-split"
                        onClick={() => onDesktopPreviewModeChange('split')}
                        className={`p-2 rounded-full transition-all ${desktopPreviewMode === 'split' ? 'bg-white dark:bg-[#2c2c2e] shadow-sm text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'}`}
                        title="分栏预览"
                    >
                        <Columns2 size={16} />
                    </button>
                    <button
                        data-testid="desktop-layout-drawer"
                        onClick={() => onDesktopPreviewModeChange('drawer')}
                        className={`p-2 rounded-full transition-all ${desktopPreviewMode === 'drawer' ? 'bg-white dark:bg-[#2c2c2e] shadow-sm text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'}`}
                        title="右侧滑动窗预览"
                    >
                        <PanelRightOpen size={16} />
                    </button>
                </div>

                {desktopPreviewMode === 'drawer' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        data-testid="desktop-drawer-toggle"
                        onClick={onToggleDesktopPreview}
                        className="apple-export-btn !bg-[#00000008] dark:!bg-[#ffffff10] border-transparent text-[#1d1d1f] dark:text-[#f5f5f7]"
                        title={desktopPreviewOpen ? '收起右侧预览窗' : '展开右侧预览窗'}
                    >
                        {desktopPreviewOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                        <span>{desktopPreviewOpen ? '收起预览' : '展开预览'}</span>
                    </motion.button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    data-testid="scroll-sync-toggle"
                    onClick={onToggleScrollSync}
                    className={`apple-export-btn !bg-[#00000008] dark:!bg-[#ffffff10] border-transparent ${scrollSyncEnabled ? 'text-[#0066cc] dark:text-[#0a84ff]' : 'text-[#86868b] dark:text-[#a1a1a6]'}`}
                    title={scrollSyncEnabled ? '关闭滚动同步' : '开启滚动同步'}
                >
                    {scrollSyncEnabled ? <Link2 size={14} /> : <Unlink2 size={14} />}
                    <span className="hidden sm:inline">{scrollSyncEnabled ? '滚动同步开' : '滚动同步关'}</span>
                    <span className="sm:hidden">{scrollSyncEnabled ? '同步开' : '同步关'}</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    data-testid="export-pdf"
                    onClick={onExportPdf}
                    className="apple-export-btn !hidden sm:!flex !bg-[#00000008] dark:!bg-[#ffffff10] border-transparent"
                >
                    <Download size={14} />
                    导出 PDF
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    data-testid="export-html"
                    onClick={onExportHtml}
                    className="apple-export-btn !hidden lg:!flex !bg-[#00000008] dark:!bg-[#ffffff10] border-transparent"
                >
                    <Download size={14} />
                    导出 HTML
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    data-testid="copy-button"
                    onClick={onCopy}
                    disabled={isCopying}
                    className={copied ? "apple-copy-btn-success apple-copy-btn" : isCopying ? "apple-copy-btn opacity-80 cursor-not-allowed" : "apple-copy-btn"}
                >
                    {copied ? <CheckCircle2 size={16} /> : isCopying ? <Loader2 className="animate-spin" size={16} /> : <Copy size={16} />}
                    <span className="hidden sm:inline">{copied ? '已复制！请贴往公众号' : isCopying ? '正在打包图片...' : '复制到公众号'}</span>
                    <span className="sm:hidden">{copied ? '已复制' : isCopying ? '打包中...' : '复制'}</span>
                </motion.button>
            </div>
        </div>
    );
}
