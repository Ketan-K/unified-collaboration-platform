import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppDispatch } from '../../../lib/hooks/reduxHooks';
import { setUserName, setUserId } from '../../../lib/redux/slices/userSlice'; 
import { setRoomId } from '../../../lib/redux/slices/roomSlice';
import Button from '../../ui/Button';
// Import input component from the correct location or create a custom one
import { Input } from '../../ui/Form';
import { v4 as uuidv4 } from 'uuid';

interface LandingPageProps {
  onJoin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onJoin }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roomCode, setRoomCode] = useState<string>(''); 
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  
  // Format room code to match XXX-XXX pattern
  const formatRoomCode = (code: string): string => {
    // Remove any non-alphanumeric characters
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
    
    // Ensure the code is exactly 6 characters
    const paddedCode = cleanCode.substring(0, 6).padEnd(6, '0');
    
    // Format as XXX-XXX
    return `${paddedCode.substring(0, 3)}-${paddedCode.substring(3, 6)}`;
  };
  
  // Get room code from URL if present
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(formatRoomCode(code));
    } 
  }, [searchParams]);
  
  // Load saved user info if available
  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    
    if (savedName) setName(savedName);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const generateFormattedRoomId = () => {
    // Generate 6 random digits
    const digits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    // Format as "123-456"
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}`;
  };
  
  const handleJoinOrCreateRoom = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }
    
    setIsJoining(true);
    setError('');
    
    try {
      // Generate a unique user ID
      const userId = uuidv4();
      
      // Store user information in Redux state
      dispatch(setUserName(name));
      dispatch(setUserId(userId));
      
      // If roomCode is empty, create a new room
      const finalRoomCode = roomCode || generateFormattedRoomId();
      dispatch(setRoomId(finalRoomCode));
      
      // Store user info in localStorage for persistence
      localStorage.setItem('userName', name);
      localStorage.setItem('userEmail', email);
      
      // Proceed to device setup
      onJoin();
      
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
      setIsJoining(false);
    }
  };
  
  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Join Meeting</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {roomCode ? "Enter your details to join" : "Create a new meeting or join existing"}
          </p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleJoinOrCreateRoom(); }} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Name
            </label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meeting Code {!roomCode && "(Optional)"}
            </label>
            <Input
              id="roomCode"
              placeholder="Enter meeting code"
              value={roomCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                // Format the input as XXX-XXX when user types
                if (e.target.value.trim() !== '') {
                  setRoomCode(formatRoomCode(e.target.value.trim()));
                } else {
                  setRoomCode('');
                }
              }}
              disabled={!!searchParams.get('code')}
            />
            {!roomCode && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty to create a new meeting
              </p>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          )}
          
          <Button
            variant="primary"
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isJoining}
            isDisabled={isJoining}
          >
            {roomCode ? 'Join Meeting' : 'Start New Meeting'}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default LandingPage;