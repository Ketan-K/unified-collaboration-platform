import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../lib/hooks/reduxHooks';
import VideoConference from '../features/VideoConference/VideoConference';
import Chat from '../features/Chat/ChatComponent';
// import Whiteboard from '../features/Whiteboard/WhiteboardComponent';

const MainContent: React.FC = () => {
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  
  // Animation variants for tab content
  const contentVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  const CodeEditorFeature = () => (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-bold text-lg text-white">Code Editor</h2>
        
        <div className="flex space-x-2">
          {/* Editor controls placeholder */}
          <div className="bg-gray-700 rounded-lg px-3 py-1">
            <p className="text-sm text-gray-300">Controls</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-0 flex">
        {/* File explorer placeholder */}
        <div className="w-48 bg-gray-900 border-r border-gray-700 p-2">
          <p className="text-sm text-gray-400 mb-2">Files</p>
          <div className="space-y-1">
            <div className="px-2 py-1 rounded hover:bg-gray-800 text-gray-300 text-sm cursor-pointer">
              index.js
            </div>
            <div className="px-2 py-1 rounded hover:bg-gray-800 text-gray-300 text-sm cursor-pointer">
              styles.css
            </div>
          </div>
        </div>
        
        {/* Code editor placeholder */}
        <div className="flex-1 bg-gray-800 p-4 font-mono">
          <pre className="text-gray-300 text-sm">
            <code>
              {`// Your code will appear here\nfunction helloWorld() {\n  console.log("Hello, world!");\n}`}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <Chat />;
      case 'whiteboard':
        return <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Whiteboard feature coming soon</p>
        </div>;
      case 'code':
        return <CodeEditorFeature />;
      case 'video':
      default:
        return <VideoConference />;
    }
  };

  return (
    <div className="h-full overflow-hidden p-4 bg-gray-100 dark:bg-gray-900">
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          className="h-full w-full"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MainContent;