import React from 'react';
import DeviceFrame from './DeviceFrame';

interface PreviewPanelProps {
    renderedHtml: string;
    deviceWidthClass: string;
    previewDevice: 'mobile' | 'tablet' | 'pc';
    previewRef: React.RefObject<HTMLDivElement>;
    previewScrollRef: React.RefObject<HTMLDivElement>;
    onPreviewScroll: () => void;
    scrollSyncEnabled: boolean;
}

export default function PreviewPanel({ renderedHtml, deviceWidthClass, previewDevice, previewRef, previewScrollRef, onPreviewScroll, scrollSyncEnabled }: PreviewPanelProps) {
    const isFramedDevice = previewDevice !== 'pc';

    return (
        <div
            ref={previewScrollRef}
            onScroll={scrollSyncEnabled ? onPreviewScroll : undefined}
            className="relative overflow-y-auto no-scrollbar bg-[#f2f2f7]/50 dark:bg-[#000000] flex flex-col z-20 flex-1 min-h-0 w-full overflow-x-hidden"
        >
            <div className={`${deviceWidthClass} transition-all duration-500 ${isFramedDevice ? 'self-center my-12 px-4 lg:px-8' : 'mt-12 mb-32 ml-4 md:ml-6 mr-auto'} h-fit min-h-[calc(100%-48px)] flex items-start justify-center relative`}>
                {isFramedDevice ? (
                    <DeviceFrame device={previewDevice as 'mobile' | 'tablet'}>
                        <div
                            ref={previewRef}
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            className={`preview-content min-w-full ${previewDevice === 'mobile' ? 'px-1 pt-1 pb-8' : 'px-2 pt-2 pb-10'}`}
                        />
                    </DeviceFrame>
                ) : (
                    <div className="bg-white rounded-[24px] overflow-hidden shadow-apple-lg transition-all duration-500 ring-1 ring-[#00000008] border-t border-white/50 w-full">
                        <div
                            ref={previewRef}
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            className="preview-content min-w-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
