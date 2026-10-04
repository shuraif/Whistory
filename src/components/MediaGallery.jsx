import React, { useState, useMemo, useRef } from 'react';
import { X, Image as ImageIcon, FileText, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MediaViewer } from './MediaViewer';
import { format } from 'date-fns';

export const MediaGallery = ({ messages, mediaMap, isZip, onClose, onGoToMessage, width, onOpenModal }) => {
  const [activeTab, setActiveTab] = useState('media'); // 'media', 'docs', 'links'
  const parentRef = useRef(null);

  const { media, docs, links } = useMemo(() => {
    const m = [];
    const d = [];
    const l = [];

    // Reverse messages to show newest first
    const reversed = [...messages].reverse();

    reversed.forEach((msg, idx) => {
      if (msg.attachment) {
        const ext = msg.attachment.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'].includes(ext)) {
          m.push({ ...msg, originalIndex: messages.length - 1 - idx });
        } else if (!['opus', 'ogg', 'mp3', 'm4a', 'wav'].includes(ext)) {
          d.push({ ...msg, originalIndex: messages.length - 1 - idx });
        }
      }
      
      if (msg.text && !msg.isSystem) {
        const urls = msg.text.match(/https?:\/\/[^\s]+/g);
        if (urls) {
          urls.forEach(url => {
            l.push({ ...msg, extractedUrl: url, originalIndex: messages.length - 1 - idx });
          });
        }
      }
    });
    return { media: m, docs: d, links: l };
  }, [messages]);

  const activeList = activeTab === 'media' ? media : activeTab === 'docs' ? docs : links;

  const rowVirtualizer = useVirtualizer({
    count: activeTab === 'media' ? Math.ceil(activeList.length / 3) : activeList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => activeTab === 'media' ? 120 : 70,
    overscan: 5,
  });

  return (
    <div 
      className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] w-full border-l border-gray-300 dark:border-[#313d45] transition-colors duration-200 shadow-xl z-20 shrink-0"
      style={{ width: width ? `${width}px` : undefined, maxWidth: '100%' }}
    >
      
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-gray-300 dark:border-[#313d45]">
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors">
          <X className="text-gray-500 dark:text-[#aebac1]" size={20} />
        </button>
        <h2 className="font-semibold text-[#111b21] dark:text-[#e9edef]">Contact Info</h2>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-around bg-white dark:bg-[#202c33] border-b border-gray-300 dark:border-[#313d45] shrink-0">
        <button 
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'media' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#54656f] dark:text-[#8696a0]'}`}
        >
          Media
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'docs' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#54656f] dark:text-[#8696a0]'}`}
        >
          Docs
        </button>
        <button 
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'links' ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#54656f] dark:text-[#8696a0]'}`}
        >
          Links
        </button>
      </div>

      {/* List Container */}
      <div ref={parentRef} className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
        {activeList.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-[#8696a0] text-sm">
            No {activeTab} found
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              
              if (activeTab === 'media') {
                const startIndex = virtualRow.index * 3;
                const rowItems = activeList.slice(startIndex, startIndex + 3);

                return (
                  <div
                    key={virtualRow.index}
                    className="absolute top-0 left-0 w-full flex"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {rowItems.map(item => (
                      <div key={item.originalIndex} className="w-1/3 p-0.5 h-[120px] cursor-pointer">
                        <div className="w-full h-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                          <MediaViewer 
                            attachment={item.attachment} 
                            mediaMap={mediaMap} 
                            isZip={isZip} 
                            disableModal={false}
                            onOpenModal={(url, attachment, type) => onOpenModal(url, attachment, type, item.originalIndex)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              // Docs & Links
              const item = activeList[virtualRow.index];
              
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full border-b border-gray-100 dark:border-[#202c33] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202c33] transition-colors"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onGoToMessage(item.originalIndex)}
                >
                  <div className="flex items-center gap-3 px-4 py-2 h-full">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#2a3942] flex items-center justify-center shrink-0">
                      {activeTab === 'docs' ? <FileText className="text-gray-500 dark:text-[#8696a0]" size={20} /> : <LinkIcon className="text-gray-500 dark:text-[#8696a0]" size={20} />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-sm font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                        {activeTab === 'docs' ? item.attachment : item.extractedUrl}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-[#8696a0]">
                        {item.date}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
