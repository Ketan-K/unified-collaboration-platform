import React from 'react';

interface WhiteboardToolbarProps {
  activeTool: string;
  activeColor: string;
  activeBrushSize: number;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onClear: () => void;
}

const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  activeTool,
  activeColor,
  activeBrushSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onClear
}) => {
  const tools = [
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'eraser', icon: '🧽', label: 'Eraser' },
    { id: 'line', icon: '↗️', label: 'Line' },
    { id: 'rectangle', icon: '▢', label: 'Rectangle' },
    { id: 'circle', icon: '⭕', label: 'Circle' }
  ];
  
  const colors = [
    { id: '#000000', label: 'Black' },
    { id: '#FF0000', label: 'Red' },
    { id: '#00FF00', label: 'Green' },
    { id: '#0000FF', label: 'Blue' },
    { id: '#FFFF00', label: 'Yellow' },
    { id: '#FF00FF', label: 'Magenta' },
    { id: '#00FFFF', label: 'Cyan' }
  ];
  
  const brushSizes = [2, 4, 6, 8, 10];

  return (
    <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex flex-wrap items-center gap-2">
      {/* Tools */}
      <div className="flex items-center space-x-1">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded-md transition-colors ${
              activeTool === tool.id 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title={tool.label}
            aria-label={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      
      {/* Colors */}
      <div className="flex items-center space-x-1 ml-2">
        {colors.map(color => (
          <button
            key={color.id}
            onClick={() => onColorChange(color.id)}
            className={`w-6 h-6 rounded-full transition-transform ${
              activeColor === color.id 
                ? 'transform scale-125 ring-2 ring-blue-500' 
                : 'hover:transform hover:scale-110'
            }`}
            style={{ backgroundColor: color.id }}
            title={color.label}
            aria-label={`Color: ${color.label}`}
          />
        ))}
      </div>
      
      {/* Brush sizes */}
      <div className="flex items-center space-x-1 ml-2">
        {brushSizes.map(size => (
          <button
            key={size}
            onClick={() => onBrushSizeChange(size)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeBrushSize === size 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title={`Size: ${size}px`}
            aria-label={`Brush size: ${size} pixels`}
          >
            <div 
              className="rounded-full bg-current" 
              style={{ 
                width: `${size}px`, 
                height: `${size}px` 
              }} 
            />
          </button>
        ))}
      </div>
      
      {/* Clear button */}
      <button
        onClick={onClear}
        className="ml-auto px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        title="Clear whiteboard"
        aria-label="Clear whiteboard"
      >
        Clear All
      </button>
    </div>
  );
};

export default WhiteboardToolbar;