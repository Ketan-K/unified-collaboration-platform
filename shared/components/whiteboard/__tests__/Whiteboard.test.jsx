import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Whiteboard from '../Whiteboard';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const emit = jest.fn();
  const on = jest.fn();
  const disconnect = jest.fn();
  
  return jest.fn(() => ({
    emit,
    on,
    disconnect,
  }));
});

// Mock fabric.js
jest.mock('fabric', () => {
  const mockCanvas = {
    on: jest.fn(),
    off: jest.fn(),
    renderAll: jest.fn(),
    setWidth: jest.fn(),
    clear: jest.fn(),
    loadFromJSON: jest.fn(),
    toJSON: jest.fn(() => ({})),
    backgroundColor: '',
    freeDrawingBrush: {
      color: '',
      width: 0
    },
    isDrawingMode: false,
    dispose: jest.fn()
  };
  
  return {
    fabric: {
      Canvas: jest.fn(() => mockCanvas),
      PencilBrush: jest.fn()
    }
  };
});

describe('Whiteboard Component', () => {
  const mockProps = {
    roomId: 'test-room',
    userId: 'test-user',
    userName: 'Test User',
    socketUrl: 'http://localhost:4000',
    onCanvasUpdate: jest.fn(),
    width: '800px',
    height: '600px'
  };
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  test('renders whiteboard component', () => {
    render(<Whiteboard {...mockProps} />);
    expect(screen.getByTitle('Pencil')).toBeInTheDocument();
    expect(screen.getByTitle('Line')).toBeInTheDocument();
    expect(screen.getByTitle('Rectangle')).toBeInTheDocument();
    expect(screen.getByTitle('Circle')).toBeInTheDocument();
    expect(screen.getByTitle('Text')).toBeInTheDocument();
    expect(screen.getByTitle('Clear Canvas')).toBeInTheDocument();
  });
  
  test('should not render toolbar in read-only mode', () => {
    render(<Whiteboard {...mockProps} readOnly={true} />);
    expect(screen.queryByTitle('Pencil')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Clear Canvas')).not.toBeInTheDocument();
  });
  
  test('changes drawing mode when clicking on tools', () => {
    render(<Whiteboard {...mockProps} />);
    
    // Click on the line tool button
    fireEvent.click(screen.getByTitle('Line'));
    expect(screen.getByTitle('Line').className).toContain('active');
    
    // Click on the rectangle tool button
    fireEvent.click(screen.getByTitle('Rectangle'));
    expect(screen.getByTitle('Rectangle').className).toContain('active');
    expect(screen.getByTitle('Line').className).not.toContain('active');
  });
  
  test('emits canvas update via socket', () => {
    const io = require('socket.io-client');
    const socketMock = io();
    
    render(<Whiteboard {...mockProps} />);
    
    // Trigger a canvas update (we're simulating this since fabric is mocked)
    const instance = screen.getByTitle('Pencil').closest('.whiteboard-component');
    // Simulate a fabric canvas event that would trigger an update
    const fabricMock = require('fabric').fabric;
    const canvasMock = fabricMock.Canvas();
    
    // Get the callback that was registered for 'object:added'
    const addedCallback = canvasMock.on.mock.calls.find(call => call[0] === 'object:added')[1];
    
    // Call the callback to simulate a canvas event
    act(() => {
      addedCallback();
    });
    
    // Check that the socket emitted the expected event
    expect(socketMock.emit).toHaveBeenCalledWith('canvas-update', expect.objectContaining({
      roomId: 'test-room',
      userId: 'test-user'
    }));
    
    // Check that onCanvasUpdate was called
    expect(mockProps.onCanvasUpdate).toHaveBeenCalled();
  });
});