import React, { useState, useEffect, useRef } from 'react';
import { getMediaUrl } from '../utils/fileHandler';
import { Play, Pause, FileText, Download, Mic } from 'lucide-react';

const CustomAudioPlayer = ({ src, attachment }) => {
  const [localDuration, setLocalDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail.url === src) {
        setIsActive(true);
        setProgress(e.detail.progress);
        setCurrentTime(e.detail.currentTime);
        setIsPlaying(e.detail.isPlaying);
      } else {
        setIsActive(false);
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    };
    
    const handleStop = (e) => {
      if (e.detail?.url === src || !e.detail?.url) {
        setIsActive(false);
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    };

    window.addEventListener('global-audio-update', handleUpdate);
    window.addEventListener('global-audio-stop', handleStop);
    return () => {
      window.removeEventListener('global-audio-update', handleUpdate);
      window.removeEventListener('global-audio-stop', handleStop);
    };
  }, [src]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (isActive) {
      window.dispatchEvent(new CustomEvent('global-audio-toggle'));
    } else {
      window.dispatchEvent(new CustomEvent('global-audio-play', { 
        detail: { url: src, attachment, duration: localDuration } 
      }));
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    
    if (isActive) {
      window.dispatchEvent(new CustomEvent('global-audio-seek', { detail: { percentage } }));
    } else {
      window.dispatchEvent(new CustomEvent('global-audio-play', { 
        detail: { url: src, attachment, duration: localDuration, startPercentage: percentage } 
      }));
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || !time) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col w-full min-w-[280px] max-w-[340px] my-1 pr-2 pb-1" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 w-full">
        {/* Avatar/Mic Circle */}
        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-[#2a3942] rounded-full flex items-center justify-center shadow-sm">
           <Mic size={20} className="text-gray-500 dark:text-[#8696a0]" />
        </div>
        
        {/* Play Button */}
        <button onClick={togglePlay} className="flex-shrink-0 text-gray-600 dark:text-[#aebac1] hover:text-gray-800 dark:hover:text-[#e9edef] transition-colors">
          {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
        </button>

        {/* Scrub Bar */}
        <div className="flex-1 h-[5px] bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer" onClick={handleSeek}>
            <div className="absolute top-0 left-0 h-full bg-[#00a884] rounded-full pointer-events-none" style={{ width: `${progress}%` }}></div>
            <div className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-[#00a884] rounded-full pointer-events-none shadow-sm" style={{ left: `calc(${progress}% - 6px)` }}></div>
        </div>
      </div>
      
      {/* Timestamps */}
      <div className="pl-[92px] text-[11px] text-gray-500 dark:text-[#8696a0] mt-1 flex justify-between font-medium tracking-wide">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(localDuration)}</span>
      </div>
      <audio src={src} preload="metadata" onLoadedMetadata={e => setLocalDuration(e.target.duration)} />
    </div>
  );
};


export const MediaViewer = ({ attachment, mediaMap, isZip, disableModal = false, onOpenModal }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;

    const loadMedia = async () => {
      try {
        const mediaItem = mediaMap.get(attachment);
        if (mediaItem) {
          objectUrl = await getMediaUrl(mediaItem, isZip);
          if (isMounted && objectUrl) {
            setUrl(objectUrl);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load media', err);
        if (isMounted) setError(true);
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment, mediaMap, isZip]);

  if (error || (!url && !mediaMap.has(attachment))) {
    return (
      <div className="bg-gray-200 p-3 rounded-md text-sm text-gray-500 flex items-center gap-2 m-1">
        <FileText size={16} />
        <span>Media missing: {attachment}</span>
      </div>
    );
  }

  const ext = attachment.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
  const isAudio = ['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac'].includes(ext);

  if (!url) {
    if (isAudio) {
       return <div className="w-full min-w-[280px] h-[52px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md my-1"></div>;
    }
    return <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md m-1"></div>;
  }

  if (isImage) {
    return (
      <img 
        src={url} 
        alt={attachment} 
        className="max-w-full h-full w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
        onClick={(e) => { 
          if (!disableModal && onOpenModal) {
            e.stopPropagation(); 
            onOpenModal(url, attachment, 'image'); 
          }
        }}
        style={{ maxHeight: '300px', objectFit: 'cover' }}
      />
    );
  }

  if (isVideo) {
    return (
      <div 
        className="relative rounded-md cursor-pointer group bg-black/10 overflow-hidden w-full h-full flex items-center justify-center" 
        onClick={(e) => { 
          if (!disableModal && onOpenModal) {
            e.stopPropagation(); 
            onOpenModal(url, attachment, 'video'); 
          }
        }}
        style={{ maxHeight: '300px' }}
      >
         <video src={url} className="max-w-full w-full h-full object-cover max-h-[300px]" />
         <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <div className="bg-black/50 p-3 rounded-full text-white backdrop-blur-sm shadow-lg">
               <Play size={24} className="ml-1" fill="currentColor" />
            </div>
         </div>
      </div>
    );
  }

  if (isAudio) {
    return (
      <CustomAudioPlayer src={url} attachment={attachment} />
    );
  }

  // Document fallback
  return (
    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-md m-1">
      <FileText size={24} className="text-gray-500 flex-shrink-0" />
      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-700 font-medium">
        {attachment}
      </div>
      <a href={url} download={attachment} className="p-2 hover:bg-black/10 rounded-full transition-colors flex-shrink-0" onClick={e => e.stopPropagation()}>
        <Download size={20} className="text-gray-600" />
      </a>
    </div>
  );
};
