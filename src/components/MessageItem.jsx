import React from 'react';
import clsx from 'clsx';
import { MediaViewer } from './MediaViewer';

export const MessageItem = ({ message, isMe, mediaMap, isZip, showAuthor, searchQuery, isActiveMatch, onOpenModal }) => {
  const renderText = () => {
    if (!searchQuery) return message.text;
    const parts = message.text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={i} className={isActiveMatch ? "bg-[#ff8f00] text-white rounded px-0.5" : "bg-[#ffeb3b] text-black rounded px-0.5"}>{part}</span>
      ) : (
        part
      )
    );
  };

  if (message.isSystem) {
    return (
      <div className="flex justify-center my-2 w-full">
        <div className="bg-[#ffeecd] dark:bg-[#182229] text-gray-700 dark:text-[#8696a0] text-xs py-1.5 px-3 rounded-lg shadow-sm max-w-[90%] text-center leading-relaxed transition-colors duration-200">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex w-full mb-1 px-4", isMe ? "justify-end" : "justify-start")}>
      <div className={clsx(
        "relative max-w-[90%] md:max-w-[70%] rounded-lg px-2 py-1.5 shadow-sm text-[14.2px] break-words transition-colors duration-200",
        isMe ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none" : "bg-white dark:bg-[#202c33] rounded-tl-none"
      )}>
        {/* Tail SVG equivalent with CSS */}
        <div className={clsx(
          "absolute top-0 w-2 h-3 transition-colors duration-200",
          isMe ? "-right-2 bg-[#d9fdd3] dark:bg-[#005c4b]" : "-left-2 bg-white dark:bg-[#202c33]"
        )} style={{ clipPath: isMe ? "polygon(0 0, 0 100%, 100% 0)" : "polygon(100% 0, 100% 100%, 0 0)" }} />

        {!isMe && showAuthor && (
          <div className="text-xs font-semibold text-blue-500 dark:text-[#53bdeb] mb-0.5 mt-0.5 ml-1">
            {message.author}
          </div>
        )}

        {message.attachment && (
          <div className="mb-1 mt-1 -mx-1">
            <MediaViewer attachment={message.attachment} mediaMap={mediaMap} isZip={isZip} onOpenModal={onOpenModal} />
          </div>
        )}

        <div className="text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap flex flex-col px-1">
          <span>{renderText()}</span>
          <div className="flex justify-end items-center gap-1 float-right mt-1 ml-3 h-4">
            <span className="text-[11px] text-gray-500 dark:text-[#8696a0]">{message.time}</span>
            {isMe && (
              <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] dark:text-[#53bdeb] fill-current">
                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
