import React, { useState, useRef } from 'react';
import { GameState, GameStats, COLORS, ICONS } from './types';
import { MainMap } from './components/MainMap';
import { Button } from './components/Button';
import { TetrisGame } from './components/minigames/TetrisGame';
import { DodgeGame } from './components/minigames/DodgeGame';
import { BugShooter } from './components/minigames/BugShooter';
import { TutorialModal } from './components/TutorialModal';
import { AudioController } from './utils/audio';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentObjective, setCurrentObjective] = useState(0);
  const [gameId, setGameId] = useState(0); // Used to reset MainMap
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [stats, setStats] = useState<GameStats>({
    startTime: 0,
    endTime: 0,
    bugsKilled: 0,
    commentsDodged: 0
  });

  const [seenTutorials, setSeenTutorials] = useState<Set<string>>(new Set());
  const [activeTutorial, setActiveTutorial] = useState<{title: string, content: string} | null>(null);

  // Audio State
  const audioController = useRef<AudioController>(new AudioController());
  const [isMuted, setIsMuted] = useState(false);

  const toggleAudio = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    audioController.current.toggleMute(newVal);
  };

  const playSound = (name: string) => {
    audioController.current.playSFX(name);
  };

  const showTutorial = (key: string, title: string, content: string) => {
    if (!seenTutorials.has(key)) {
      setActiveTutorial({ title, content });
      setSeenTutorials(prev => new Set(prev).add(key));
      playSound('click');
      return true;
    }
    return false;
  };

  const closeTutorial = () => {
    setActiveTutorial(null);
    playSound('click');
  };

  const startGame = () => {
    audioController.current.startMusic();
    playSound('start');

    setStats({
      startTime: Date.now(),
      endTime: 0,
      bugsKilled: 0,
      commentsDodged: 0
    });
    setCurrentObjective(0);
    setGameId(prev => prev + 1); 
    setGameState(GameState.MAP);
    
    showTutorial('map', 'TU PRIMERA FEATURE', 'Debes conectar las TRES etapas en el orden correcto. ¡Buena suerte Y CUIDADO CON LOS VIRUS!');
  };

  const handleObjectiveReached = () => {
    playSound('objective');
    if (currentObjective === 0) {
      setGameState(GameState.MINIGAME_TETRIS);
      showTutorial('tetris', 'LLUVIA DE MEJORAS', '¡Tu Project Manager se ha vuelto loco!. Debes intentar encajar 5 líneas de mejoras sin que el código se desborde. ¡Suerte, amigo!');
    } else if (currentObjective === 1) {
      setGameState(GameState.MINIGAME_DODGE);
      showTutorial('dodge', 'HORA DE LA PR', 'Tu código no está gustando mucho. Intenta esquivar la lluvia de comentarios destructivos durante 15 segundos. ¡Tú puedes!');
    } else if (currentObjective === 2) {
      setGameState(GameState.MINIGAME_SHOOTER);
      showTutorial('shooter', 'BUG EN PRODUCCIÓN', 'Bugs críticos detectados en producción. Elimínalos antes de que el CEO se entere.');
    }
  };

  const handleMinigameComplete = () => {
    playSound('win');
    const nextObj = currentObjective + 1;
    if (nextObj > 2) {
      setStats(prev => ({ ...prev, endTime: Date.now() }));
      setGameState(GameState.WIN);
    } else {
      setCurrentObjective(nextObj);
      setGameState(GameState.MAP);
    }
  };

  const handleGameOver = (reason: string) => {
    playSound('gameover');
    setGameOverMessage(reason);
    setGameState(GameState.GAMEOVER);
  };

  const updateStats = (type: 'bug' | 'comment', amount: number) => {
    setStats(prev => ({
      ...prev,
      bugsKilled: type === 'bug' ? prev.bugsKilled + amount : prev.bugsKilled,
      commentsDodged: type === 'comment' ? prev.commentsDodged + amount : prev.commentsDodged
    }));
  };

  // Rendering Helpers
  const renderOverlay = () => {
    switch (gameState) {
      case GameState.MENU:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050505] z-50">
            <div className="text-center p-8 border-4 border-[#00FFFF] shadow-[0_0_30px_rgba(0,255,255,0.2)] bg-black/80">
              <h1 className="text-4xl md:text-6xl font-bold mb-8 text-[#00FFFF] font-mono tracking-tighter glow-text">
                EL CAMINO DEL <br/> <span className="text-[#39FF14]">DESARROLLADOR</span>
              </h1>
              <p className="mb-8 text-[#39FF14] text-lg font-mono">
                {'>'} Inicializar entorno de desarrollo..._
              </p>
              <Button onClick={startGame} onMouseEnter={() => playSound('hover')}>./START_GAME.SH</Button>
            </div>
          </div>
        );

      case GameState.GAMEOVER:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
            <div className="bg-black p-8 border-4 border-[#FF3333] text-center shadow-[0_0_30px_rgba(255,51,51,0.4)] max-w-md w-full mx-4">
              <h2 className="text-4xl font-bold text-[#FF3333] mb-4 font-mono uppercase blink">SYSTEM FAILURE</h2>
              <p className="mb-6 text-xl text-white font-mono">{gameOverMessage || `PROCESO TERMINADO`}</p>
              <Button variant="danger" onClick={startGame} onMouseEnter={() => playSound('hover')}>REINICIAR DESARROLLO</Button>
            </div>
          </div>
        );

      case GameState.WIN:
        const timeSpent = ((stats.endTime - stats.startTime) / 1000).toFixed(1);
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
            <div className="bg-black p-8 border-4 border-[#39FF14] text-center shadow-[0_0_30px_rgba(57,255,20,0.4)] w-full max-w-md mx-4">
              <h2 className="text-3xl font-bold text-[#39FF14] mb-6 font-mono uppercase">FEATURE COMPLETADA 🚀</h2>
              
              <div className="space-y-4 text-left bg-[#111] p-4 border border-[#39FF14] mb-6 font-mono text-[#39FF14]">
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span>RUNTIME:</span>
                  <span className="font-bold">{timeSpent}s</span>
                </div>
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span>BUGS_FIXED:</span>
                  <span className="font-bold">{stats.bugsKilled}</span>
                </div>
                <div className="flex justify-between">
                  <span>FEEDBACK_IGNORED:</span>
                  <span className="font-bold">{stats.commentsDodged}</span>
                </div>
              </div>
              
              <Button variant="success" onClick={startGame} onMouseEnter={() => playSound('hover')}>NEW_PROJECT()</Button>
            </div>
          </div>
        );
      
      case GameState.MINIGAME_TETRIS:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
            <TetrisGame 
              onComplete={handleMinigameComplete} 
              onFail={handleGameOver}
              paused={!!activeTutorial}
              playSound={playSound}
            />
          </div>
        );

      case GameState.MINIGAME_DODGE:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
            <DodgeGame 
              onComplete={handleMinigameComplete} 
              onFail={handleGameOver}
              updateStats={(c) => updateStats('comment', c)} 
              paused={!!activeTutorial}
              playSound={playSound}
            />
          </div>
        );

      case GameState.MINIGAME_SHOOTER:
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
            <BugShooter 
              onComplete={handleMinigameComplete} 
              onFail={handleGameOver}
              updateStats={(c) => updateStats('bug', c)} 
              paused={!!activeTutorial}
              playSound={playSound}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-mono select-none">
      {/* Background Main Game - Always rendered but paused if tutorial active OR minigame active */}
      <MainMap 
        key={gameId} // Force reset on new game
        currentObjective={currentObjective}
        onGameOver={handleGameOver}
        onObjectiveReached={handleObjectiveReached}
        paused={!!activeTutorial || gameState !== GameState.MAP}
        playSound={playSound}
      />

      {/* HUD */}
      {gameState !== GameState.MENU && gameState !== GameState.WIN && gameState !== GameState.GAMEOVER && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30 pointer-events-none font-mono">
           <div className="bg-black/80 border border-[#39FF14] text-[#39FF14] p-2 shadow-lg">
             {'>'} TARGET: {currentObjective === 0 ? "FIND_PC()" : currentObjective === 1 ? "VERIFY_CODE()" : "UPLOAD_CLOUD()"}
           </div>
        </div>
      )}

      {/* Audio Toggle (Always visible) */}
      <button 
        onClick={toggleAudio}
        className={`absolute bottom-4 right-4 z-50 p-3 border-2 font-bold transition-all ${isMuted ? 'border-red-500 text-red-500 bg-black' : 'border-[#39FF14] text-black bg-[#39FF14]'}`}
      >
        {isMuted ? '🔇 MUTE' : '🔊 AUDIO'}
      </button>

      {/* Overlays (Minigames, Menu, Results) */}
      {renderOverlay()}

      {/* Tutorial Overlay */}
      {activeTutorial && (
        <TutorialModal 
          title={activeTutorial.title} 
          content={activeTutorial.content} 
          onClose={closeTutorial} 
        />
      )}
    </div>
  );
};

export default App;