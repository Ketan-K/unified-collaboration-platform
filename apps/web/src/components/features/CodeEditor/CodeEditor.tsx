import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../lib/hooks/reduxHooks';
import { addFile, updateFileContent, setActiveFile } from '../../../lib/redux/slices/codeEditorSlice';
import { v4 as uuidv4 } from 'uuid';

const CodeEditor: React.FC = () => {
  const dispatch = useAppDispatch();
  const { files, activeFileId } = useAppSelector(state => state.codeEditor);
  const userId = useAppSelector(state => state.user?.userId || '');
  const userName = useAppSelector(state => (state.user as any)?.name || 'Anonymous');
  const [content, setContent] = useState<string>('');
  const activeFile = files.find(file => file.id === activeFileId);
  
  useEffect(() => {
    // Initialize with default file if none exists
    if (files.length === 0) {
      const newFileId = uuidv4();
      dispatch(addFile({
        id: newFileId,
        name: 'main.js',
        language: 'javascript',
        content: '// Start coding here\n\n',
        createdBy: {
          id: userId,
          name: userName
        },
        lastModifiedBy: {
          id: userId,
          name: userName
        },
        lastModified: new Date().toISOString()
      }));
    }
  }, [dispatch, files.length, userId, userName]);

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
    }
  }, [activeFile]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (activeFileId) {
      dispatch(updateFileContent({
        id: activeFileId,
        content: newContent,
        userId,
        userName
      }));
    }
  };

  const handleFileSelect = (fileId: string) => {
    dispatch(setActiveFile(fileId));
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-bold text-lg text-white">Code Editor</h2>
        
        <div className="flex space-x-2">
          <select 
            className="bg-gray-700 rounded-lg px-3 py-1 text-sm text-gray-300"
            value={activeFile?.language || 'javascript'}
            onChange={() => {}}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 p-0 flex">
        {/* File explorer */}
        <div className="w-48 bg-gray-900 border-r border-gray-700 p-2">
          <p className="text-sm text-gray-400 mb-2">Files</p>
          <div className="space-y-1">
            {files.map(file => (
              <div 
                key={file.id}
                className={`px-2 py-1 rounded ${activeFileId === file.id ? 'bg-blue-600' : 'hover:bg-gray-800'} text-gray-300 text-sm cursor-pointer`}
                onClick={() => handleFileSelect(file.id)}
              >
                {file.name}
              </div>
            ))}
          </div>
        </div>
        
        {/* Code editor main area */}
        <div className="flex-1 relative">
          <textarea
            className="absolute inset-0 bg-gray-900 text-gray-100 font-mono p-4 resize-none outline-none"
            value={content}
            onChange={handleContentChange}
            spellCheck={false}
          />
        </div>
      </div>
      
      {/* Status bar */}
      <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <div>
          {activeFile?.name || 'No file selected'} • {activeFile?.language || 'unknown'}
        </div>
        <div>
          Last modified: {activeFile?.lastModified ? new Date(activeFile.lastModified).toLocaleString() : 'Never'}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;