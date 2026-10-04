import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageItem } from './MessageItem';
import { MediaGallery } from './MediaGallery';
import { Search, MoreVertical, Phone, Video, Sun, Moon, ChevronUp, ChevronDown, Download, Smile, Paperclip, Mic, ChevronLeft, ChevronRight, X, MessageCircle, Play, Pause, Github } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getMediaUrl } from '../utils/fileHandler';

const GlobalAudioPlayer = ({ activeAudio, onClose }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (activeAudio && audioRef.current) {
      audioRef.current.src = activeAudio.url;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
         playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [activeAudio]);

  useEffect(() => {
    const handleToggle = () => {
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      }
    };
    const handleSeek = (e) => {
       if (audioRef.current && audioRef.current.duration) {
         audioRef.current.currentTime = (e.detail.percentage * audioRef.current.duration);
       }
    };
    window.addEventListener('global-audio-toggle', handleToggle);
    window.addEventListener('global-audio-seek', handleSeek);
    return () => {
       window.removeEventListener('global-audio-toggle', handleToggle);
       window.removeEventListener('global-audio-seek', handleSeek);
    };
  }, [isPlaying]);

  const onLoadedMetadata = (e) => {
    setDuration(e.target.duration);
    if (activeAudio?.startPercentage) {
      e.target.currentTime = activeAudio.startPercentage * e.target.duration;
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p);
      setCurrentTime(audioRef.current.currentTime);
      window.dispatchEvent(new CustomEvent('global-audio-update', { 
        detail: { 
           url: activeAudio.url, 
           progress: p, 
           currentTime: audioRef.current.currentTime, 
           isPlaying 
        } 
      }));
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || !time) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!activeAudio) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-[#202c33] border-b border-gray-300 dark:border-[#313d45] shadow-sm z-20 w-full transition-colors duration-200">
      <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-[#2a3942] rounded-full flex items-center justify-center">
         <Mic size={20} className="text-gray-500 dark:text-[#8696a0]" />
      </div>
      <button onClick={() => { if(isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }} className="text-gray-600 dark:text-[#aebac1] hover:text-[#00a884] transition-colors">
        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#111b21] dark:text-[#e9edef] truncate">{activeAudio.attachment}</div>
        <div className="h-1.5 mt-1 bg-gray-300 dark:bg-gray-600 rounded-full w-full relative">
           <div className="absolute top-0 left-0 h-full bg-[#00a884] rounded-full transition-all duration-75" style={{ width: `${progress}%` }}></div>
           <div className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-[#00a884] rounded-full pointer-events-none shadow-sm transition-all duration-75" style={{ left: `calc(${progress}% - 6px)` }}></div>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-[#8696a0] font-medium w-16 text-right shrink-0">
         {formatTime(currentTime)}
      </div>
      <button onClick={onClose} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors shrink-0">
         <X size={20} className="text-gray-500 dark:text-[#aebac1]" />
      </button>
      <audio 
         ref={audioRef} 
         onTimeUpdate={onTimeUpdate} 
         onLoadedMetadata={onLoadedMetadata} 
         onEnded={() => { 
           setIsPlaying(false); 
           window.dispatchEvent(new CustomEvent('global-audio-update', { 
              detail: { url: activeAudio.url, progress: 100, currentTime: duration, isPlaying: false }
           })); 
         }} 
      />
    </div>
  );
};

export const ChatViewer = ({ messages, participants, mediaMap, isZip, isDark, toggleTheme }) => {
  const [perspective, setPerspective] = useState(participants[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mediaGalleryWidth, setMediaGalleryWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [globalAudioTrack, setGlobalAudioTrack] = useState(null);
  
  const parentRef = useRef(null);

  const mediaMessages = useMemo(() => {
    return messages
      .map((msg, idx) => ({ ...msg, originalIndex: idx }))
      .filter(msg => {
        if (!msg.attachment) return false;
        const ext = msg.attachment.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'].includes(ext);
      });
  }, [messages]);

  const navigateMedia = async (direction, e) => {
    if (e) e.stopPropagation();
    if (!activeMedia) return;
    
    const currentIndex = mediaMessages.findIndex(m => m.originalIndex === activeMedia.originalIndex);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < mediaMessages.length) {
      const nextMsg = mediaMessages[nextIndex];
      const mediaItem = mediaMap.get(nextMsg.attachment);
      if (mediaItem) {
         const url = await getMediaUrl(mediaItem, isZip);
         const ext = nextMsg.attachment.split('.').pop().toLowerCase();
         const type = ['mp4', 'mov'].includes(ext) ? 'video' : 'image';
         setActiveMedia({ url, attachment: nextMsg.attachment, type, originalIndex: nextMsg.originalIndex });
      }
    }
  };

  useEffect(() => {
    const handlePlay = (e) => {
      setGlobalAudioTrack(e.detail);
    };
    window.addEventListener('global-audio-play', handlePlay);
    return () => window.removeEventListener('global-audio-play', handlePlay);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setMediaGalleryWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const virtualItems = useMemo(() => {
    const items = [];
    let lastDate = null;

    messages.forEach((msg, idx) => {
      if (msg.date !== lastDate) {
        let formattedDate = msg.date;
        let dateObj = null;
        try {
          const dStr = msg.date.replace(/[.-]/g, '/');
          const parts = dStr.split('/');
          let m = parseInt(parts[0]);
          let d = parseInt(parts[1]);
          let y = parseInt(parts[2]);
          if (m > 12) {
             m = parseInt(parts[1]);
             d = parseInt(parts[0]);
          }
          if (y < 100) y = 2000 + y;
          dateObj = new Date(y, m - 1, d);
          
          if (isToday(dateObj)) formattedDate = 'Today';
          else if (isYesterday(dateObj)) formattedDate = 'Yesterday';
          else formattedDate = format(dateObj, 'MMMM d, yyyy');
        } catch(e) {}

        items.push({ type: 'date', id: `date-${idx}`, text: formattedDate, dateObj });
        lastDate = msg.date;
      }
      items.push({ type: 'message', ...msg, originalIndex: idx });
    });
    return items;
  }, [messages]);

  const availableDates = useMemo(() => {
    return virtualItems
      .map((item, idx) => (item.type === 'date' ? { ...item, index: idx } : null))
      .filter(Boolean);
  }, [virtualItems]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const matches = [];
    const lowerQuery = searchQuery.toLowerCase();
    virtualItems.forEach((item, idx) => {
      if (item.type === 'message' && !item.isSystem && item.text.toLowerCase().includes(lowerQuery)) {
        matches.push(idx);
      }
    });
    return matches;
  }, [virtualItems, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65,
    overscan: 10,
  });

  useEffect(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(0);
      rowVirtualizer.scrollToIndex(searchMatches[0], { align: 'center' });
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchMatches, rowVirtualizer]);

  const goToNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    rowVirtualizer.scrollToIndex(searchMatches[nextIdx], { align: 'center' });
  };

  const goToPrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    rowVirtualizer.scrollToIndex(searchMatches[prevIdx], { align: 'center' });
  };

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] transition-colors duration-200">
      <div className="flex flex-col flex-1 h-full min-w-0 relative">
      {/* Header */}
      <header className="flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 border-b border-gray-300 dark:border-[#313d45] z-10 shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 -ml-1 rounded transition-colors" onClick={() => setShowMediaGallery(!showMediaGallery)}>
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold overflow-hidden shrink-0">
             <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participants.filter(p => p !== perspective)[0] || 'Chat')}&background=random`} alt="Avatar" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-semibold text-[#111b21] dark:text-[#e9edef] leading-tight truncate max-w-[200px] md:max-w-[400px]">
              {participants.filter(p => p !== perspective).join(', ') || perspective || 'Chat'}
            </h1>
            <span className="text-xs text-gray-500 dark:text-[#8696a0] truncate max-w-[200px] md:max-w-[400px]">
              {participants.length > 2 ? participants.join(', ') : 'online'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 text-[#54656f] dark:text-[#aebac1]">
          {/* GitHub Link */}
          <a href="https://github.com/shuraif/Whistory" target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors" title="View Source on GitHub">
            <Github size={20} />
          </a>
          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors mr-1">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="hidden md:flex items-center bg-white dark:bg-[#2a3942] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-transparent transition-colors">
            <span className="text-xs mr-2 font-semibold text-gray-500 dark:text-[#8696a0]">Perspective:</span>
            <select 
              value={perspective} 
              onChange={e => setPerspective(e.target.value)}
              className="text-sm bg-transparent outline-none cursor-pointer max-w-[150px] truncate text-[#111b21] dark:text-[#e9edef]"
            >
              {participants.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-white dark:bg-[#2a3942] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-transparent w-48 md:w-64 transition-colors">
            <Search size={16} className="text-gray-400 dark:text-[#8696a0] mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-sm text-[#111b21] dark:text-[#e9edef] placeholder-gray-400 dark:placeholder-[#8696a0]"
            />
            {searchMatches.length > 0 && (
              <div className="flex items-center text-xs text-gray-400 dark:text-[#8696a0] mr-2 whitespace-nowrap">
                {currentMatchIndex + 1}/{searchMatches.length}
              </div>
            )}
            {searchQuery && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={goToPrevMatch} className="p-1 hover:bg-gray-100 dark:hover:bg-[#374045] rounded"><ChevronUp size={16} className="text-gray-500 dark:text-gray-300"/></button>
                <button onClick={goToNextMatch} className="p-1 hover:bg-gray-100 dark:hover:bg-[#374045] rounded"><ChevronDown size={16} className="text-gray-500 dark:text-gray-300"/></button>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4 ml-2 relative">
            <Video size={20} className="cursor-pointer hover:text-gray-700 dark:hover:text-[#d1d7db] transition-colors" />
            <Phone size={20} className="cursor-pointer hover:text-gray-700 dark:hover:text-[#d1d7db] transition-colors" />
            
            <div className="relative flex items-center justify-center">
              <MoreVertical 
                size={20} 
                className="cursor-pointer hover:text-gray-700 dark:hover:text-[#d1d7db] transition-colors"
                onClick={() => setShowMenu(!showMenu)} 
              />
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 top-8 w-48 bg-white dark:bg-[#233138] rounded-lg shadow-xl py-2 z-50 border border-gray-100 dark:border-[#313d45]">
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-[#111b21] dark:text-[#e9edef] hover:bg-gray-100 dark:hover:bg-[#182229] transition-colors"
                      onClick={() => {
                        setShowMenu(false);
                        rowVirtualizer.scrollToIndex(0, { align: 'start' });
                      }}
                    >
                      Go to first message
                    </button>
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-[#111b21] dark:text-[#e9edef] hover:bg-gray-100 dark:hover:bg-[#182229] transition-colors"
                      onClick={() => {
                        setShowMenu(false);
                        rowVirtualizer.scrollToIndex(virtualItems.length - 1, { align: 'end' });
                      }}
                    >
                      Go to last message
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Audio Player */}
      <GlobalAudioPlayer 
         activeAudio={globalAudioTrack} 
         onClose={() => { 
            setGlobalAudioTrack(null); 
            window.dispatchEvent(new CustomEvent('global-audio-stop')); 
         }} 
      />

      {/* Chat Area - Virtualized */}
      <div className="flex-1 relative z-0 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] transition-colors duration-200">
        
        {/* Fixed Background Pattern */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-all duration-200"
          style={{ 
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", 
            backgroundRepeat: 'repeat', 
            backgroundSize: '400px',
            opacity: isDark ? 0.06 : 0.6,
            filter: isDark ? 'invert(1)' : 'none'
          }}
        />

        {/* Scrollable Message List */}
        <div ref={parentRef} className="absolute inset-0 overflow-y-auto z-10">
          <div className="px-4 md:px-16 py-6" style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = virtualItems[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="py-0.5">
                  {item.type === 'date' ? (
                    <div className="flex justify-center my-2 w-full">
                      <button 
                        onClick={() => setShowDatePicker(true)}
                        className="bg-white dark:bg-[#182229] hover:bg-gray-100 dark:hover:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] text-xs font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 cursor-pointer"
                      >
                        {item.text}
                      </button>
                    </div>
                  ) : (
                      <MessageItem 
                        message={item} 
                        isMe={item.author === perspective}
                        showAuthor={item.author !== perspective && participants.length > 2}
                        mediaMap={mediaMap}
                        isZip={isZip}
                        searchQuery={searchQuery}
                        isActiveMatch={searchMatches.length > 0 && virtualRow.index === searchMatches[currentMatchIndex]}
                        onOpenModal={(url, attachment, type) => setActiveMedia({ url, attachment, type, originalIndex: virtualRow.index })}
                      />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
      
      {/* Dummy Input Bar */}
      <div className="flex items-center px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] gap-3 transition-colors duration-200 z-10">
        <Smile size={24} className="text-[#54656f] dark:text-[#aebac1] cursor-pointer" />
        <Paperclip size={24} className="text-[#54656f] dark:text-[#aebac1] cursor-pointer" />
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-2.5 flex items-center border border-transparent">
          <input 
            type="text" 
            placeholder="Type a message" 
            className="w-full bg-transparent outline-none text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-[15px]" 
            disabled 
          />
        </div>
        <Mic size={24} className="text-[#54656f] dark:text-[#aebac1] cursor-pointer" />
      </div>
      
      {/* Mobile Perspective Switcher */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-[#202c33] p-2 border-t border-gray-200 dark:border-[#313d45] transition-colors duration-200">
        <span className="text-xs font-semibold text-gray-500 dark:text-[#8696a0]">Perspective:</span>
        <select 
          value={perspective} 
          onChange={e => setPerspective(e.target.value)}
          className="text-sm bg-gray-100 dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] px-3 py-1.5 rounded-lg outline-none cursor-pointer flex-1 ml-2 transition-colors duration-200"
        >
          {participants.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      </div>
      
      {/* Media Gallery Panel */}
      {showMediaGallery && (
        <>
          {/* Drag Handle */}
          <div 
            className="w-1.5 cursor-col-resize hover:bg-[#00a884] dark:hover:bg-[#00a884] active:bg-[#00a884] z-30 transition-colors shrink-0"
            onMouseDown={() => setIsResizing(true)}
          ></div>
          <MediaGallery 
            messages={messages}
            mediaMap={mediaMap}
            isZip={isZip}
            onClose={() => setShowMediaGallery(false)}
            onGoToMessage={(idx) => rowVirtualizer.scrollToIndex(idx, { align: 'center' })}
            width={mediaGalleryWidth}
            onOpenModal={(url, attachment, type, originalIndex) => setActiveMedia({ url, attachment, type, originalIndex })}
          />
        </>
      )}

      {/* Global Media Modal */}
      {activeMedia && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm" onClick={() => setActiveMedia(null)}>
          <div className="absolute top-4 right-4 flex gap-4 z-[110]">
             <button 
               className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white/90 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
               onClick={(e) => {
                 e.stopPropagation();
                 setActiveMedia(null);
                 if (activeMedia.originalIndex !== undefined) {
                   let attempts = 0;
                   const targetIndex = activeMedia.originalIndex;
                   const scrollInterval = setInterval(() => {
                     rowVirtualizer.scrollToIndex(targetIndex, { align: 'center' });
                     attempts++;
                     if (attempts > 3) clearInterval(scrollInterval);
                   }, 50);
                 }
               }}
               title="Go to message in chat"
             >
               <MessageCircle size={18} />
               <span className="hidden sm:inline">Go to chat</span>
             </button>
             <a href={activeMedia.url} download={activeMedia.attachment} onClick={e => e.stopPropagation()} className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 rounded-full">
               <Download size={24} />
             </a>
             <button className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 rounded-full" onClick={() => setActiveMedia(null)}>
               <X size={24} />
             </button>
          </div>

          <button 
             onClick={(e) => navigateMedia(-1, e)} 
             className="absolute left-4 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[110]"
          >
            <ChevronLeft size={32} />
          </button>
          
          <button 
             onClick={(e) => navigateMedia(1, e)} 
             className="absolute right-4 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[110]"
          >
            <ChevronRight size={32} />
          </button>

          {activeMedia.type === 'image' ? (
             <img src={activeMedia.url} alt={activeMedia.attachment} className="max-w-full max-h-[90vh] object-contain cursor-default select-none shadow-2xl" onClick={e => e.stopPropagation()} />
          ) : (
             <video src={activeMedia.url} controls autoPlay className="max-w-full max-h-[90vh] outline-none shadow-2xl" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDatePicker(false)}>
          <div className="bg-white dark:bg-[#233138] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-[#313d45] flex justify-between items-center bg-[#f0f2f5] dark:bg-[#202c33]">
              <h3 className="font-semibold text-[#111b21] dark:text-[#e9edef]">Jump to Date</h3>
              <button onClick={() => setShowDatePicker(false)} className="text-gray-500 hover:text-gray-700 dark:text-[#aebac1] dark:hover:text-[#e9edef] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 flex justify-center bg-white dark:bg-[#233138]">
              <DatePicker
                inline
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                minDate={availableDates.length > 0 ? availableDates[0].dateObj : null}
                maxDate={availableDates.length > 0 ? availableDates[availableDates.length - 1].dateObj : null}
                selected={null}
                onChange={(date) => {
                  const targetTime = date.getTime();
                  let closestDate = null;
                  let minDiff = Infinity;
                  availableDates.forEach(d => {
                    if (d.dateObj) {
                      const diff = Math.abs(d.dateObj.getTime() - targetTime);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestDate = d;
                      }
                    }
                  });
                  if (closestDate) {
                    setShowDatePicker(false);
                    rowVirtualizer.scrollToIndex(closestDate.index, { align: 'start' });
                  }
                }}
                highlightDates={availableDates.map(d => d.dateObj).filter(Boolean)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
