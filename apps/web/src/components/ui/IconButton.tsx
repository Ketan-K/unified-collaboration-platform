import React from 'react';
import { motion } from 'framer-motion';

interface IconButtonProps {
  icon: React.ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'transparent';
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  isDisabled?: boolean;
  showBadge?: boolean;
  badgeCount?: number;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  ariaLabel: string;
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'primary',
  size = 'md',
  isActive = false,
  isDisabled = false,
  showBadge = false,
  badgeCount = 0,
  onClick,
  className = '',
  ariaLabel,
  tooltip,
}) => {
  // Base styles
  const baseStyles = 'relative flex flex-col items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size based styles
  const sizeStyles = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg',
  };

  // Icon size based on button size
  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  // Variant based styles
  const variantStyles = {
    primary: `bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white focus:ring-blue-500 ${isActive ? 'shadow-lg shadow-blue-500/30' : ''}`,
    secondary: `bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 focus:ring-gray-400 ${isActive ? 'shadow-lg shadow-gray-500/30' : ''}`,
    danger: `bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white focus:ring-red-500 ${isActive ? 'shadow-lg shadow-red-500/30' : ''}`,
    success: `bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white focus:ring-green-500 ${isActive ? 'shadow-lg shadow-green-500/30' : ''}`,
    ghost: `bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-gray-300 ${isActive ? 'bg-gray-200 dark:bg-gray-700' : ''}`,
    transparent: `bg-transparent hover:bg-gray-100/20 dark:hover:bg-gray-800/30 text-gray-700 dark:text-gray-200 focus:ring-gray-300 ${isActive ? 'bg-gray-100/30 dark:bg-gray-800/40' : ''}`,
  };
  
  // Disabled styles
  const disabledStyles = isDisabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';
  
  // Combine all styles
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`;

  return (
    <div className="relative group">
      <motion.button
        type="button"
        onClick={onClick}
        className={combinedStyles}
        disabled={isDisabled}
        aria-label={ariaLabel}
        title={tooltip}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <span className={iconSize[size]}>
          {icon}
        </span>
        {showBadge && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </motion.button>
      
      {label && (
        <span className="text-xs mt-1 text-center text-gray-600 dark:text-gray-300">
          {label}
        </span>
      )}
      
      {tooltip && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default IconButton;