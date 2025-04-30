import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import './style.css';

/**
 * Collaborative whiteboard component.
 * Provides a canvas for drawing with real-time collaboration between users.
 */
const Whiteboard = ({
  roomId,
  userId,
  userName,
  socketUrl = 'http://localhost:4000',
  height = '500px',
  width = '100%',
  readOnly = false
}) => {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const isDrawingRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  
  // Tools and settings
  const [activeTool, setActiveTool] = useState('pencil');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // User state
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Initialize canvas and socket connection
  useEffect(() => {
    // Create Fabric.js canvas
    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: canvasContainerRef.current.offsetWidth,
      height: parseInt(height, 10) || 500,
      backgroundColor: '#ffffff',
    });
    
    const canvas = fabricCanvasRef.current;
    
    // Configure free drawing brush
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;
    
    // Setup socket connection
    if (roomId && userId) {
      socketRef.current = io(socketUrl);
      
      // Join whiteboard room
      socketRef.current.emit('join-room', {
        roomId,
        userId,
        userName: userName || 'Anonymous'
      });
      
      // Handle whiteboard updates from other users
      socketRef.current.on('whiteboard-update', handleRemoteUpdate);
      
      // Handle room users update
      socketRef.current.on('room-users', ({ users }) => {
        setConnectedUsers(users);
      });
      
      socketRef.current.on('user-joined', ({ user }) => {
        setConnectedUsers(prev => [...prev, user]);
        
        // Send current canvas state to new user
        if (canvas) {
          const canvasJson = JSON.stringify(canvas.toJSON());
          socketRef.current.emit('whiteboard-update', {
            roomId,
            drawData: {
              type: 'canvas-state',
              json: canvasJson,
            }
          });
        }
      });
      
      socketRef.current.on('user-left', ({ userId }) => {
        setConnectedUsers(prev => prev.filter(user => user.id !== userId));
      });
      
      socketRef.current.on('connect', () => {
        setIsConnected(true);
      });
      
      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });
    }
    
    // Set initial history
    saveCanvasState();
    
    // Handle canvas object modifications
    canvas.on('object:added', handleCanvasModified);
    canvas.on('object:modified', handleCanvasModified);
    canvas.on('object:removed', handleCanvasModified);
    
    // Handle window resize
    const handleResize = () => {
      if (canvasContainerRef.current && canvas) {
        canvas.setWidth(canvasContainerRef.current.offsetWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (canvas) {
        canvas.dispose();
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [roomId, userId, height, socketUrl]);
  
  // Update brush when tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    switch (activeTool) {
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        break;
      case 'line':
        canvas.isDrawingMode = false;
        break;
      case 'rect':
        canvas.isDrawingMode = false;
        break;
      case 'circle':
        canvas.isDrawingMode = false;
        break;
      case 'text':
        canvas.isDrawingMode = false;
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
        break;
      case 'select':
        canvas.isDrawingMode = false;
        break;
      default:
        canvas.isDrawingMode = true;
        break;
    }
    
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;
  }, [activeTool, brushColor, brushSize]);
  
  // Handle mouse down for shape drawing
  const handleMouseDown = (e) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'select') return;
    
    isDrawingRef.current = true;
    const pointer = canvas.getPointer(e.e);
    
    switch (activeTool) {
      case 'line':
        const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          strokeWidth: brushSize,
          stroke: brushColor,
          selectable: !readOnly,
        });
        canvas.add(line);
        canvas.setActiveObject(line);
        break;
      case 'rect':
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
          selectable: !readOnly,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        break;
      case 'circle':
        const circle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 1,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
          selectable: !readOnly,
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
        break;
      case 'text':
        const text = new fabric.IText('Type here', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: brushSize * 4,
          fill: brushColor,
          selectable: !readOnly,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        break;
    }
  };
  
  // Handle mouse move for shape drawing
  const handleMouseMove = (e) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isDrawingRef.current || activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'select' || activeTool === 'text') return;
    
    const pointer = canvas.getPointer(e.e);
    const activeObj = canvas.getActiveObject();
    
    if (!activeObj) return;
    
    switch (activeTool) {
      case 'line':
        activeObj.set({
          x2: pointer.x,
          y2: pointer.y
        });
        break;
      case 'rect':
        const width = Math.abs(pointer.x - activeObj.left);
        const height = Math.abs(pointer.y - activeObj.top);
        activeObj.set({
          width,
          height
        });
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(pointer.x - activeObj.left, 2) + 
          Math.pow(pointer.y - activeObj.top, 2)
        ) / 2;
        activeObj.set({
          radius
        });
        break;
    }
    
    canvas.renderAll();
  };
  
  // Handle mouse up for shape drawing
  const handleMouseUp = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isDrawingRef.current || activeTool === 'pencil' || activeTool === 'eraser') return;
    
    isDrawingRef.current = false;
    
    // Save canvas state
    saveCanvasState();
    
    // Synchronize with other clients
    syncCanvasWithServer();
  };
  
  // Handle remote updates from other users
  const handleRemoteUpdate = ({ userId: remoteUserId, drawData }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Don't process our own updates
    if (remoteUserId === userId) return;
    
    if (drawData.type === 'canvas-state') {
      // Full canvas state update
      canvas.loadFromJSON(JSON.parse(drawData.json), canvas.renderAll.bind(canvas));
      
      // Update history
      saveCanvasState();
    }
  };
  
  // Handle canvas modifications and throttle updates
  const handleCanvasModified = () => {
    // Throttle updates to avoid overwhelming the network
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      syncCanvasWithServer();
    }, 200);
  };
  
  // Sync canvas state with the server
  const syncCanvasWithServer = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !socketRef.current || !socketRef.current.connected || !roomId) return;
    
    const canvasJson = JSON.stringify(canvas.toJSON());
    
    socketRef.current.emit('whiteboard-update', {
      roomId,
      drawData: {
        type: 'canvas-state',
        json: canvasJson,
      }
    });
  };
  
  // Save the current canvas state to history
  const saveCanvasState = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Remove future states if we're not at the end of the history
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    
    // Add current state
    const canvasJson = JSON.stringify(canvas.toJSON());
    newHistory.push(canvasJson);
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setCanvasHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // Undo the last action
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newIndex = historyIndex - 1;
    const state = canvasHistory[newIndex];
    
    // Load previous state
    canvas.loadFromJSON(JSON.parse(state), canvas.renderAll.bind(canvas));
    
    setHistoryIndex(newIndex);
    syncCanvasWithServer();
  };
  
  // Redo the last undone action
  const handleRedo = () => {
    if (historyIndex >= canvasHistory.length - 1) return;
    
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newIndex = historyIndex + 1;
    const state = canvasHistory[newIndex];
    
    // Load next state
    canvas.loadFromJSON(JSON.parse(state), canvas.renderAll.bind(canvas));
    
    setHistoryIndex(newIndex);
    syncCanvasWithServer();
  };
  
  // Clear the canvas
  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Clear all objects
    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    
    // Save new state
    saveCanvasState();
    syncCanvasWithServer();
  };
  
  // Export canvas as image
  const handleExport = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Generate data URL
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    // Create download link
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${new Date().toISOString()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Delete selected objects
  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;
    
    // Remove selected objects
    canvas.remove(...activeObjects);
    canvas.discardActiveObject().renderAll();
    
    // Save new state
    saveCanvasState();
    syncCanvasWithServer();
  };
  
  return (
    <div className="whiteboard-container">
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        {/* Drawing tools */}
        <div className="tool-group">
          <button 
            className={`tool-button ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => setActiveTool('select')}
            title="Selection Tool"
          >
            <span role="img" aria-label="Selection Tool">👆</span>
          </button>
          
          <button 
            className={`tool-button ${activeTool === 'pencil' ? 'active' : ''}`}
            onClick={() => setActiveTool('pencil')}
            title="Pencil"
          >
            <span role="img" aria-label="Pencil">✏️</span>
          </button>
          
          <button 
            className={`tool-button ${activeTool === 'line' ? 'active' : ''}`}
            onClick={() => setActiveTool('line')}
            title="Line"
          >
            <span role="img" aria-label="Line">/</span>
          </button>
          
          <button 
            className={`tool-button ${activeTool === 'rect' ? 'active' : ''}`}
            onClick={() => setActiveTool('rect')}
            title="Rectangle"
          >
            <span role="img" aria-label="Rectangle">□</span>
          </button>
          
          <button 
            className={`tool-button ${activeTool === 'circle' ? 'active' : ''}`}
            onClick={() => setActiveTool('circle')}
            title="Circle"
          >
            <span role="img" aria-label="Circle">○</span>
          </button>
          
          <button 
            className={`tool-button ${activeTool === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTool('text')}
            title="Text"
          >
            <span role="img" aria-label="Text">T</span>
          </button>
          
          <button 
            className={`tool-button ${activeTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setActiveTool('eraser')}
            title="Eraser"
          >
            <span role="img" aria-label="Eraser">🧽</span>
          </button>
        </div>
        
        {/* Color picker */}
        <div className="tool-group">
          <input 
            type="color" 
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="color-picker"
            title="Color"
          />
          
          {/* Brush size */}
          <select 
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            className="brush-size"
            title="Brush Size"
          >
            <option value="1">1px</option>
            <option value="3">3px</option>
            <option value="5">5px</option>
            <option value="10">10px</option>
            <option value="15">15px</option>
            <option value="20">20px</option>
          </select>
        </div>
        
        {/* Actions */}
        <div className="tool-group">
          <button 
            className="tool-button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <span role="img" aria-label="Undo">↩️</span>
          </button>
          
          <button 
            className="tool-button"
            onClick={handleRedo}
            disabled={historyIndex >= canvasHistory.length - 1}
            title="Redo"
          >
            <span role="img" aria-label="Redo">↪️</span>
          </button>
          
          <button 
            className="tool-button"
            onClick={handleClear}
            title="Clear"
          >
            <span role="img" aria-label="Clear">🗑️</span>
          </button>
          
          <button 
            className="tool-button"
            onClick={handleDelete}
            title="Delete Selected"
          >
            <span role="img" aria-label="Delete">❌</span>
          </button>
          
          <button 
            className="tool-button"
            onClick={handleExport}
            title="Export as Image"
          >
            <span role="img" aria-label="Export">💾</span>
          </button>
        </div>
      </div>
      
      {/* Connection status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      {/* Canvas container */}
      <div 
        className="canvas-container" 
        ref={canvasContainerRef}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
      
      {/* Connected users */}
      <div className="connected-users">
        <div className="user-count">
          {connectedUsers.length} user{connectedUsers.length !== 1 ? 's' : ''} connected
        </div>
        <div className="user-list">
          {connectedUsers.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-avatar">{user.name[0].toUpperCase()}</div>
              <div className="user-name">{user.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// PropTypes definition for better documentation
Whiteboard.propTypes = {
  roomId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  userName: PropTypes.string,
  socketUrl: PropTypes.string,
  height: PropTypes.string,
  width: PropTypes.string,
  readOnly: PropTypes.bool
};

export default Whiteboard;