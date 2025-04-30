import { FC } from 'react';

export interface WhiteboardProps {
  roomId: string;
  userId: string;
  userName?: string;
  readOnly?: boolean;
  socketUrl?: string;
  width?: string | number;
  height?: string | number;
  colors?: string[];
  onCanvasUpdate?: (data: any) => void;
  initialCanvasData?: string;
}

declare const Whiteboard: FC<WhiteboardProps>;

export default Whiteboard;