import React, { ChangeEvent, SelectHTMLAttributes, InputHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

/* -------------- Input Component -------------- */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className = '',
    size = 'md',
    disabled = false,
    error,
    icon,
    iconPosition = 'left',
    ...props 
  }, ref) => {
    // Base styles
    const baseStyles = 'w-full rounded-lg border bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 transition-all duration-200';
    
    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };
    
    // State styles
    const stateStyles = disabled 
      ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed'
      : error
        ? 'border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-red-500 text-red-900 dark:text-red-200'
        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-gray-900 dark:text-white';
    
    // Icon styles
    const iconStyles = icon 
      ? iconPosition === 'left' ? 'pl-10' : 'pr-10' 
      : '';
    
    const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${stateStyles} ${iconStyles} ${className}`;

    return (
      <div className="relative">
        {icon && (
          <div className={`absolute ${iconPosition === 'left' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-500`}>
            {icon}
          </div>
        )}
        
        <motion.input
          ref={ref}
          className={combinedStyles}
          disabled={disabled}
          whileFocus={{ scale: 1.01 }}
          {...props}
        />
        
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* -------------- Select Component -------------- */
export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className = '',
    options,
    size = 'md',
    disabled = false,
    placeholder,
    error,
    ...props 
  }, ref) => {
    // Base styles
    const baseStyles = 'w-full rounded-lg border bg-white dark:bg-gray-800 appearance-none focus:outline-none focus:ring-2 transition-all duration-200';
    
    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };
    
    // State styles
    const stateStyles = disabled 
      ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed'
      : error
        ? 'border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-red-500 text-red-900 dark:text-red-200'
        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-gray-900 dark:text-white';
    
    const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${stateStyles} ${className}`;

    return (
      <div className="relative">
        <div className="relative">
          <motion.select
            ref={ref}
            className={combinedStyles}
            disabled={disabled}
            whileFocus={{ scale: 1.01 }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </motion.select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg 
              className="w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

/* -------------- Form Component -------------- */
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const Form: React.FC<FormProps> = ({ children, onSubmit, className = '', ...props }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form className={`space-y-4 ${className}`} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
};

/* -------------- Form Field Components -------------- */
export interface FormFieldProps {
  children: React.ReactNode;
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  children, 
  label, 
  htmlFor, 
  error, 
  hint 
}) => {
  return (
    <div className="space-y-1">
      {label && htmlFor && (
        <label 
          htmlFor={htmlFor} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default {
  Input,
  Select,
  Form,
  FormField
};