import { createContext } from 'react';

export interface CanvasActions {
  createTextNodeFromSource: (sourceNodeId: string, sourceHandleId: string) => void;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);
