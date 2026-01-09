import React, { useEffect, useRef, useState } from 'react';
import { COLORS, ICONS, SoundFn } from '../../types';

interface DodgeProps {
  onComplete: () => void;
  onFail: (reason: string) => void;
  updateStats: (count: number) => void;
  paused: boolean;
  playSound: SoundFn;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  speed: number;
  icon: string;
}

export const DodgeGame: React.FC<DodgeProps> = ({ onComplete, onFail, updateStats, paused, playSound }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastSpawn = useRef(0);
  const isPaused = useRef(paused);
  
  const playerX = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const roadOffset = useRef(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [lives, setLives] = useState(3);
  const [isInvincible, setIsInvincible] = useState(false);

  const ROAD_WIDTH = 300; 
  const PLAYER_SIZE = 40;
  const OBSTACLE_SIZE = 40;

  useEffect(() => {
    isPaused.current = paused;
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (timeLeft === 0) {
        onComplete();
    }
  }, [timeLeft, onComplete]);

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const centerX = W / 2;
    const roadLeft = centerX - ROAD_WIDTH / 2;
    // const roadRight = centerX + ROAD_WIDTH / 2;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (!isPaused.current && timeLeft > 0) {
        roadOffset.current = (roadOffset.current + 10) % 60;

        if (Date.now() - lastSpawn.current > 400) { 
            const laneCount = 5;
            const laneWidth = ROAD_WIDTH / laneCount;
            const lane = Math.floor(Math.random() * laneCount);
            
            obstacles.current.push({
                id: Date.now(),
                x: roadLeft + (lane * laneWidth) + (laneWidth/2),
                y: -50,
                speed: 6 + Math.random() * 4,
                icon: Math.random() > 0.8 ? '📝' : ICONS.comment
            });
            lastSpawn.current = Date.now();
        }

        obstacles.current.forEach(obs => {
            obs.y += obs.speed;
        });

        const initialCount = obstacles.current.length;
        obstacles.current = obstacles.current.filter(obs => obs.y < H + 50);
        const passedCount = initialCount - obstacles.current.length;
        if (passedCount > 0) updateStats(passedCount);

        if (!isInvincible) {
            const pX = playerX.current;
            const pY = H - 80;
            
            for (const obs of obstacles.current) {
                const dist = Math.hypot(pX - obs.x, pY - obs.y);
                if (dist < (PLAYER_SIZE/2 + OBSTACLE_SIZE/2) * 0.8) {
                    handleCrash();
                    break;
                }
            }
        }
    }

    // --- DRAWING ---

    // Retro Grid Background
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    for(let y = roadOffset.current; y < H; y+=60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Road Limits (Neon Lines)
    ctx.strokeStyle = COLORS.item2; // Yellow
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(roadLeft, 0); ctx.lineTo(roadLeft, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX + ROAD_WIDTH/2, 0); ctx.lineTo(centerX + ROAD_WIDTH/2, H); ctx.stroke();

    // Road Lanes
    ctx.strokeStyle = '#555';
    ctx.setLineDash([30, 30]);
    ctx.lineDashOffset = -roadOffset.current;
    
    ctx.beginPath();
    ctx.moveTo(centerX - ROAD_WIDTH/6, 0);
    ctx.lineTo(centerX - ROAD_WIDTH/6, H);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + ROAD_WIDTH/6, 0);
    ctx.lineTo(centerX + ROAD_WIDTH/6, H);
    ctx.stroke();

    ctx.setLineDash([]); 

    // Obstacles
    ctx.font = '30px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    obstacles.current.forEach(obs => {
        ctx.fillStyle = '#FFF';
        ctx.fillText(obs.icon, obs.x, obs.y);
    });

    // Player
    if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.font = '40px Courier New';
        ctx.fillText(ICONS.player, playerX.current, H - 80);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  const handleCrash = () => {
    playSound('hit');
    if (lives > 1) {
        setLives(l => l - 1);
        setIsInvincible(true);
        setTimeout(() => setIsInvincible(false), 1500);
    } else {
        onFail("¡NO SABES ACEPTAR CRÍTICAS! El proyecto se ha caído.");
    }
  };

  const handleMove = (x: number) => {
    if (paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width / 2;
    const minX = centerX - ROAD_WIDTH / 2 + 20;
    const maxX = centerX + ROAD_WIDTH / 2 - 20;
    
    playerX.current = Math.max(minX, Math.min(maxX, x));
  };

  useEffect(() => {
    if (canvasRef.current) {
        playerX.current = canvasRef.current.width / 2;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
    
    const handleKey = (e: KeyboardEvent) => {
        if (paused) return;
        const step = 20;
        if (e.key === 'ArrowLeft') handleMove(playerX.current - step);
        if (e.key === 'ArrowRight') handleMove(playerX.current + step);
    };
    window.addEventListener('keydown', handleKey);

    return () => {
        cancelAnimationFrame(animationRef.current);
        window.removeEventListener('keydown', handleKey);
    };
  }, [lives, isInvincible, paused, timeLeft]); 

  return (
    <div className="flex flex-col items-center justify-center bg-black p-4 border-4 border-[#FFFF00] shadow-[0_0_20px_rgba(255,255,0,0.2)]">
      <div className="flex justify-between items-center w-full mb-4 px-4 font-mono">
        <div className="flex gap-1 text-2xl text-[#FF3333]">
           {Array(Math.max(0, lives)).fill('♥').map((h, i) => <span key={i}>{h}</span>)}
        </div>
        <h2 className="text-xl font-bold text-[#FFFF00]">DODGE_COMMENTS.EXE</h2>
        <div className="text-xl font-bold text-[#FF3333]">T-{timeLeft}s</div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={window.innerWidth > 400 ? 400 : window.innerWidth - 32}
        height={400}
        className="bg-[#111] border border-[#333] cursor-none touch-none"
        onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleMove(e.clientX - rect.left);
        }}
        onTouchMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleMove(e.touches[0].clientX - rect.left);
        }}
      />
      <p className="text-xs text-[#FFFF00] mt-2 font-mono">MUEVE PARA ESQUIVAR</p>
    </div>
  );
};
