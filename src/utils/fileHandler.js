import * as zip from '@zip.js/zip.js';

export const handleDirectoryUpload = async (files) => {
  let chatText = '';
  const mediaMap = new Map();

  for (const file of files) {
    if (file.name.endsWith('.txt')) {
      if (!chatText || file.name.includes('chat')) {
         chatText = await file.text();
      }
    } else {
      if (!file.name.startsWith('.')) {
        mediaMap.set(file.name, file); // store File object, we can createObjectURL on demand or immediately. We'll lazy create it to save memory for thousands of files.
      }
    }
  }

  return { chatText, mediaMap, isZip: false };
};

export const handleZipUpload = async (file) => {
  const mediaMap = new Map();
  let chatText = '';

  const zipFileReader = new zip.BlobReader(file);
  const zipReader = new zip.ZipReader(zipFileReader);

  const entries = await zipReader.getEntries();

  for (const entry of entries) {
    if (entry.directory) continue;
    
    const parts = entry.filename.split('/');
    const filename = parts[parts.length - 1];
    
    if (filename.startsWith('.')) continue;

    if (filename.endsWith('.txt')) {
      if (!chatText || filename.includes('chat')) {
        const textWriter = new zip.TextWriter();
        chatText = await entry.getData(textWriter);
      }
    } else {
      mediaMap.set(filename, entry); 
    }
  }
  
  // We keep zipReader open so we can lazy load entries later
  return { chatText, mediaMap, isZip: true, zipReader };
};

const getMimeType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mp3': return 'audio/mpeg';
    case 'ogg':
    case 'opus': return 'audio/ogg';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
};

export const getMediaUrl = async (mediaItem, isZip) => {
  if (!mediaItem) return null;
  
  if (!isZip) {
    // mediaItem is a File
    return URL.createObjectURL(mediaItem);
  } else {
    // mediaItem is a ZipEntry
    const mimeType = getMimeType(mediaItem.filename);
    const blobWriter = new zip.BlobWriter(mimeType);
    const blob = await mediaItem.getData(blobWriter);
    return URL.createObjectURL(blob);
  }
};
