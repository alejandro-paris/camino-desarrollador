import React, { useEffect, useRef, useState } from 'react';
import { ICONS, COLORS, SoundFn } from '../../types';

interface BugShooterProps {
  onComplete: (kills: number) => void;
  onFail: (reason: string) => void;
  updateStats: (count: number) => void;
  paused: boolean;
  playSound: SoundFn;
}

interface BugEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  dead: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const BugShooter: React.FC<BugShooterProps> = ({ onComplete, onFail, updateStats, paused, playSound }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const isPaused = useRef(paused);

  // Game State Refs (for physics loop)
  const bugs = useRef<BugEntity[]>([]);
  const particles = useRef<Particle[]>([]);
  const cursor = useRef<{ x: number, y: number }>({ x: 150, y: 150 });
  const lastSpawn = useRef(0);
  
  // UI State
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameEnded, setGameEnded] = useState(false);

  // Constants
  const GRAVITY = 0.15;
  const BUG_SIZE = 25;

  useEffect(() => {
    isPaused.current = paused;
  }, [paused]);

  // Timer Logic
  useEffect(() => {
    if (paused || gameEnded) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameEnded(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paused, gameEnded]);

  // End Game Check
  useEffect(() => {
    if (gameEnded) {
      if (score >= 3) {
        setTimeout(() => onComplete(score), 1000); // Slight delay to see result
      } else {
        onFail("'¡BUGS FUERA DE CONTROL! No lograste eliminar suficientes errores.");
      }
    }
  }, [gameEnded, score, onComplete, onFail]);

  const spawnBug = (width: number, height: number) => {
    bugs.current.push({
      id: Date.now() + Math.random(),
      x: Math.random() * (width - 60) + 30,
      y: height + 30,
      vx: (Math.random() - 0.5) * 4, // Horizontal drift
      vy: -(Math.random() * 5 + 9),   // Launch strength
      rotation: Math.random() * Math.PI,
      dead: false
    });
  };

  const createExplosion = (x: number, y: number) => {
    playSound('explosion');
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color: Math.random() > 0.5 ? '#FF3333' : '#39FF14' // Red or Green glitch pixels
      });
    }
  };

  const shoot = () => {
    if (paused || gameEnded) return;
    playSound('shoot');

    let hit = false;
    bugs.current.forEach(bug => {
      if (bug.dead) return;
      
      // Simple circle collision
      const dist = Math.hypot(bug.x - cursor.current.x, bug.y - cursor.current.y);
      if (dist < BUG_SIZE * 1.5) {
        bug.dead = true;
        createExplosion(bug.x, bug.y);
        hit = true;
      }
    });

    if (hit) {
      setScore(s => s + 1);
      updateStats(1);
    }
  };

  // Main Loop
  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear & Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for(let i=0; i<width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke(); }
    for(let i=0; i<height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke(); }

    if (!isPaused.current && !gameEnded) {
      // Spawn Logic
      if (Date.now() - lastSpawn.current > 600) { // Spawn every 0.6s
        spawnBug(width, height);
        lastSpawn.current = Date.now();
      }

      // Physics: Bugs
      bugs.current.forEach(bug => {
        bug.x += bug.vx;
        bug.y += bug.vy;
        bug.vy += GRAVITY; // Gravity
        bug.rotation += 0.05;
      });

      // Cleanup off-screen bugs
      bugs.current = bugs.current.filter(b => b.y < height + 100 && !b.dead);

      // Physics: Particles
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
      });
      particles.current = particles.current.filter(p => p.life > 0);
    }

    // --- DRAWING ---

    // Particles
    particles.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      const size = p.life * 6;
      ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
    });
    ctx.globalAlpha = 1.0;

    // Bugs
    ctx.font = '30px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    bugs.current.forEach(bug => {
      ctx.save();
      ctx.translate(bug.x, bug.y);
      ctx.rotate(bug.rotation);
      ctx.fillText(ICONS.bug, 0, 0);
      ctx.restore();
    });

    // Crosshair (The Player's Aim)
    const cx = cursor.current.x;
    const cy = cursor.current.y;
    
    // Cross lines
    ctx.strokeStyle = '#39FF14'; // Terminal Green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    // Circle
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Corner brackets for "Tech" feel
    const brSize = 30;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#BD00FF'; // Purple accent
    ctx.beginPath();
    // Top Left
    ctx.moveTo(cx - brSize, cy - brSize + 10); ctx.lineTo(cx - brSize, cy - brSize); ctx.lineTo(cx - brSize + 10, cy - brSize);
    // Top Right
    ctx.moveTo(cx + brSize - 10, cy - brSize); ctx.lineTo(cx + brSize, cy - brSize); ctx.lineTo(cx + brSize, cy - brSize + 10);
    // Bottom Left
    ctx.moveTo(cx - brSize, cy + brSize - 10); ctx.lineTo(cx - brSize, cy + brSize); ctx.lineTo(cx - brSize + 10, cy + brSize);
    // Bottom Right
    ctx.moveTo(cx + brSize - 10, cy + brSize); ctx.lineTo(cx + brSize, cy + brSize); ctx.lineTo(cx + brSize, cy + brSize - 10);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  const handleInputMove = (x: number, y: number) => {
    cursor.current = { x, y };
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameEnded]);

  return (
    <div className="flex flex-col items-center justify-center bg-black p-1 border-4 border-[#BD00FF] shadow-[0_0_30px_rgba(189,0,255,0.3)]">
      {/* Header Info */}
      <div className="flex justify-between w-full bg-[#111] p-2 border-b border-[#333] font-mono mb-0">
        <div className="text-[#FF3333] font-bold text-xl animate-pulse">
           T-{timeLeft}s
        </div>
        <div className="text-[#BD00FF] font-bold text-xl">
           KILLS: {score} <span className="text-xs text-gray-500">/ 3 REQ</span>
        </div>
      </div>
      
      {/* Canvas Container */}
      <div className="relative cursor-none touch-none"> 
        <canvas
          ref={canvasRef}
          width={window.innerWidth > 400 ? 350 : window.innerWidth - 40}
          height={350}
          className="bg-[#050505] block"
          onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleInputMove(e.clientX - rect.left, e.clientY - rect.top);
          }}
          onMouseDown={shoot}
          onTouchMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleInputMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
          }}
          onTouchStart={shoot}
        />
        
        {/* Helper Text Overlay */}
        <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none opacity-50">
            <span className="text-xs text-[#39FF14] font-mono">APUNTA Y DISPARA</span>
        </div>
      </div>
    </div>
  );
};
