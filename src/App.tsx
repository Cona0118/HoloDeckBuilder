import CardGrid from './components/CardGrid';
import DeckPanel from './components/DeckPanel';

export default function App() {
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#0f0f1a' }}>
      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <CardGrid />
        </div>
        <div className="w-105 shrink-0 border-l border-gray-800 overflow-hidden">
          <DeckPanel />
        </div>
      </div>
    </div>
  );
}
