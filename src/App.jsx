import React, { useState, useRef } from 'react';
import { handleDirectoryUpload, handleZipUpload } from './utils/fileHandler';
import { parseChatFile } from './utils/chatParser';
import { ChatViewer } from './components/ChatViewer';
import { FolderOpen, FileArchive, Sun, Moon } from 'lucide-react';

function App() {
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(true);

  // Apply dark class to body/html
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);
  
  const dirInputRef = useRef(null);

  const processTextAndMedia = async (chatText, mediaMap, isZip) => {
    if (!chatText) {
      throw new Error("No _chat.txt or chat history file found in the provided directory/zip.");
    }
    const parsed = await parseChatFile(chatText);
    setChatData({ ...parsed, mediaMap, isZip });
  };

  const onDirSelect = async (e) => {
    try {
      setLoading(true);
      setError('');
      const files = Array.from(e.target.files);
      const { chatText, mediaMap, isZip } = await handleDirectoryUpload(files);
      await processTextAndMedia(chatText, mediaMap, isZip);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onZipDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.zip')) {
      setError('Please drop a valid .zip file.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const { chatText, mediaMap, isZip } = await handleZipUpload(file);
      await processTextAndMedia(chatText, mediaMap, isZip);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (chatData) {
    return <ChatViewer {...chatData} isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center p-4 font-sans transition-colors duration-200 relative">
      {/* Theme Toggle for Splash Screen */}
      <button 
        onClick={() => setIsDark(!isDark)}
        className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-[#202c33] text-gray-600 dark:text-gray-300 shadow-md hover:scale-105 transition-transform"
      >
        {isDark ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="bg-white dark:bg-[#202c33] max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden transition-colors duration-200">
        <div className="bg-[#00a884] dark:bg-[#005c4b] p-8 text-white text-center transition-colors duration-200">
          <h1 className="text-3xl font-bold mb-2">Whistory</h1>
          <p className="text-emerald-100 dark:text-emerald-200/80">100% Private • Purely Client-Side • No Uploads</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Processing chat backup...</p>
              <p className="text-xs text-gray-400 mt-2">This may take a moment for large files.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              
              <button 
                onClick={() => dirInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#00a884] dark:hover:border-[#00a884] hover:bg-emerald-50 dark:hover:bg-[#182229] transition-all duration-200 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-[#005c4b]/30 group-hover:text-[#00a884] dark:group-hover:text-[#00a884] transition-colors mb-4">
                  <FolderOpen size={32} className="text-gray-500 dark:text-gray-400 group-hover:text-[#00a884] dark:group-hover:text-[#00a884]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Open Folder</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Select an unzipped chat folder containing _chat.txt and media.</p>
                <input 
                  type="file" 
                  ref={dirInputRef} 
                  webkitdirectory="true" 
                  className="hidden" 
                  onChange={onDirSelect}
                />
              </button>

              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={onZipDrop}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#00a884] dark:hover:border-[#00a884] hover:bg-emerald-50 dark:hover:bg-[#182229] transition-all duration-200 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-[#005c4b]/30 group-hover:text-[#00a884] dark:group-hover:text-[#00a884] transition-colors mb-4">
                  <FileArchive size={32} className="text-gray-500 dark:text-gray-400 group-hover:text-[#00a884] dark:group-hover:text-[#00a884]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Drop ZIP File</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Drag and drop your exported .zip chat backup here.</p>
              </div>
              
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 dark:bg-[#182229] p-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-[#313d45] transition-colors duration-200">
          Your data never leaves your device. Everything is parsed and processed locally in your browser.
        </div>
      </div>
    </div>
  );
}

export default App;
