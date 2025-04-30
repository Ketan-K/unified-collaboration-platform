import React, { useRef, useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../lib/hooks/reduxHooks';
import WhiteboardToolbar from './WhiteboardToolbar';
import { 
  addStroke, 
  clearWhiteboard, 
  setTool, 
  setColor, 
  setBrushSize 
} from '../../../lib/redux/slices/whiteboardSlice';
import socketService from '../../../utils/socket/socketService';

interface Point {
  x: number;
  y: number;
}

interface StrokeData {
  id: string;
  points: Point[];
  color: string;
  size: number;
  tool: string;
  userId: string;
}

const WhiteboardComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { strokes, tool, color, brushSize, isEnabled } = useAppSelector(state => state.whiteboard);
  const { userId, userName } = useAppSelector(state => state.user);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);
  
  // Canvas dimensions state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  
  // Initialize canvas and drawing contexts
  useEffect(() => {
    if (!canvasRef.current || !isEnabled) return;
    
    // Set up and resize canvas
    const resizeCanvas = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        setCanvasDimensions({ width, height });
        
        // Redraw all strokes after resize
        redrawCanvas();
      }
    };
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Subscribe to whiteboard events from socket
    socketService.onWhiteboardStrokeAdded((stroke) => {
      // Only add strokes from other users
      if (stroke.userId !== userId) {
        dispatch(addStroke(stroke));
      }
    });
    
    socketService.onWhiteboardCleared(() => {
      dispatch(clearWhiteboard());
    });
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [dispatch, isEnabled, userId]);
  
  // Redraw canvas when strokes change
  useEffect(() => {
    redrawCanvas();
  }, [strokes]);
  
  // Draw all strokes on canvas
  const redrawCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      // Draw based on tool type
      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        // Draw freeform path
        context.beginPath();
        context.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let i = 1; i < stroke.points.length; i++) {
          context.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        
        context.stroke();
      } else if (stroke.tool === 'line' && stroke.points.length >= 2) {
        // Draw straight line
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      } else if (stroke.tool === 'rectangle' && stroke.points.length >= 2) {
        // Draw rectangle
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        
        const width = end.x - start.x;
        const height = end.y - start.y;
        
        context.strokeRect(start.x, start.y, width, height);
      } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
        // Draw circle
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        
        const centerX = start.x;
        const centerY = start.y;
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        context.stroke();
      }
    });
  };
  
  // Convert mouse/touch position to canvas coordinates
  const getPointerPosition = (event: React.MouseEvent | React.TouchEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle mouse and touch events differently
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  };
  
  // Drawing events
  const handlePointerDown = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isEnabled) return;
    event.preventDefault();
    
    isDrawingRef.current = true;
    currentPointsRef.current = [];
    
    const point = getPointerPosition(event);
    currentPointsRef.current.push(point);
  };
  
  const handlePointerMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isEnabled || !isDrawingRef.current) return;
    event.preventDefault();
    
    const point = getPointerPosition(event);
    currentPointsRef.current.push(point);
    
    // Draw temporary stroke on canvas
    drawTemporaryStroke();
  };
  
  const handlePointerUp = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isEnabled || !isDrawingRef.current) return;
    event.preventDefault();
    
    isDrawingRef.current = false;
    
    // Add final point if needed
    if (tool !== 'pen' && tool !== 'eraser') {
      const point = getPointerPosition(event);
      currentPointsRef.current.push(point);
    }
    
    // Save stroke
    if (currentPointsRef.current.length > 0) {
      const newStroke: StrokeData = {
        id: `${Date.now()}-${userId}`,
        points: [...currentPointsRef.current],
        color: tool === 'eraser' ? '#FFFFFF' : color,
        size: brushSize,
        tool,
        userId: userId || 'local',
      };
      
      // Add to redux store
      dispatch(addStroke(newStroke));
      
      // Send to server
      socketService.sendWhiteboardStroke(newStroke);
      
      // Reset current stroke
      currentPointsRef.current = [];
    }
  };
  
  const handlePointerCancel = () => {
    isDrawingRef.current = false;
    currentPointsRef.current = [];
    redrawCanvas(); // Clear any temporary drawing
  };
  
  // Draw current stroke while drawing
  const drawTemporaryStroke = () => {
    if (!canvasRef.current || currentPointsRef.current.length === 0) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Redraw existing strokes
    redrawCanvas();
    
    // Draw current stroke
    const points = currentPointsRef.current;
    const drawColor = tool === 'eraser' ? '#FFFFFF' : color;
    
    context.strokeStyle = drawColor;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    if (tool === 'pen' || tool === 'eraser') {
      // Draw freeform path
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
      }
      
      context.stroke();
    } else if (tool === 'line' && points.length >= 2) {
      // Draw line from start point to current point
      const start = points[0];
      const end = points[points.length - 1];
      
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    } else if (tool === 'rectangle' && points.length >= 2) {
      // Draw rectangle from start point to current point
      const start = points[0];
      const end = points[points.length - 1];
      
      const width = end.x - start.x;
      const height = end.y - start.y;
      
      context.strokeRect(start.x, start.y, width, height);
    } else if (tool === 'circle' && points.length >= 2) {
      // Draw circle with start as center and distance to current point as radius
      const start = points[0];
      const end = points[points.length - 1];
      
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      
      context.beginPath();
      context.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      context.stroke();
    }
  };
  
  // Handle toolbar actions
  const handleToolChange = (newTool: string) => {
    dispatch(setTool(newTool));
  };
  
  const handleColorChange = (newColor: string) => {
    dispatch(setColor(newColor));
  };
  
  const handleBrushSizeChange = (newSize: number) => {
    dispatch(setBrushSize(newSize));
  };
  
  const handleClearWhiteboard = () => {
    dispatch(clearWhiteboard());
    socketService.clearWhiteboard();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Whiteboard toolbar */}
      <WhiteboardToolbar 
        activeTool={tool}
        activeColor={color}
        activeBrushSize={brushSize}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onBrushSizeChange={handleBrushSizeChange}
        onClear={handleClearWhiteboard}
      />
      
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {isEnabled ? (
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerCancel}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onTouchCancel={handlePointerCancel}
            className="absolute inset-0 touch-none"
            style={{ cursor: tool === 'eraser' ? 'not-allowed' : 'crosshair' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-xl font-medium">Whiteboard is disabled</p>
              <p className="mt-2">Only the host can enable the whiteboard</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Status bar */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {userName} • {tool.charAt(0).toUpperCase() + tool.slice(1)}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Canvas: {canvasDimensions.width}×{canvasDimensions.height}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardComponent;