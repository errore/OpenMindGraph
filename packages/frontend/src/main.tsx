import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from './canvas/Canvas';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Canvas />
  </StrictMode>,
);
