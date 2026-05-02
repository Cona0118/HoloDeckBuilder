import { createBrowserRouter } from 'react-router-dom';
import BuilderPage from './pages/BuilderPage';
import BoardPage from './pages/BoardPage';

export const router = createBrowserRouter([
  { path: '/', element: <BuilderPage /> },
  { path: '/board', element: <BoardPage /> },
]);
