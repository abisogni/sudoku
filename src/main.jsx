import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Sudoku from './pages/Sudoku.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sudoku />
  </StrictMode>
);
