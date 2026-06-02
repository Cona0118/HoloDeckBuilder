import { createBrowserRouter } from 'react-router-dom';
import BuilderPage from './pages/BuilderPage';
import BoardPage from './pages/BoardPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';

export const router = createBrowserRouter([
  { path: '/', element: <BuilderPage /> },
  { path: '/board', element: <BoardPage /> },
  { path: '/lobby', element: <LobbyPage /> },
  { path: '/room/:code', element: <RoomPage /> },
  { path: '/game/:code', element: <GamePage /> },
  { path: '/game', element: <GamePage /> },
]);
