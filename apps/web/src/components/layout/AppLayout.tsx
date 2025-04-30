"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../lib/hooks/reduxHooks';
import { setIsMobile, incrementTimeElapsed } from '../../lib/redux/slices/uiSlice';
import MainContent from './MainContent';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = () => {
  const dispatch = useAppDispatch();
  
  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      dispatch(setIsMobile(window.innerWidth < 768));
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [dispatch]);

  // Timer for tracking meeting duration
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch(incrementTimeElapsed());
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, [dispatch]);

  // Generate grid template based on current state
  const generateGridTemplate = () => {
    
    return '1fr';
  };

  // Layout variants for animations
  
  const layoutVariants = {
    mobile: {
      gridTemplateColumns: '1fr',
    },
    desktop: {
      gridTemplateColumns: generateGridTemplate(),
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* Main content area */}
      <motion.div 
        className="flex-1 grid h-full overflow-hidden"
        variants={layoutVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Main content area */}
        <MainContent />
      </motion.div>
    </div>
  );
};

export default AppLayout;