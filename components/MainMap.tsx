import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Position, Enemy, COLORS, ICONS, SoundFn } from '../types';

interface MainMapProps {
  currentObjective: number;
  onGameOver: (reason: string) => void;
  onObjectiveReached: () => void;
  paused: boolean;
  playSound: SoundFn;
}

export const MainMap: React.FC<MainMapProps> = ({ currentObjective, onGameOver, onObjectiveReached, paused, playSound }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  const isPaused = useRef(paused);
  useEffect(() => {
    isPaused.current = paused;
  }, [paused]);

  const playerPos = useRef<Position>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  // Trail history for fluid animation
  const playerTrail = useRef<Position[]>([]);
  
  const enemies = useRef<Enemy[]>([]);
  const lastEnemySpawn = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const targetPos = useRef<Position | null>(null);
  
  // Keyboard State
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        keysPressed.current.add(key);
        
        // If user uses keyboard, cancel mouse navigation to prevent conflict
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
            targetPos.current = null;
            isDragging.current = false;
        }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const spawnEnemy = (width: number, height: number) => {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const padding = 50;

    switch(side) {
      case 0: x = Math.random() * width; y = -padding; break;
      case 1: x = width + padding; y = Math.random() * height; break;
      case 2: x = Math.random() * width; y = height + padding; break;
      case 3: x = -padding; y = Math.random() * height; break;
    }

    enemies.current.push({
      id: Date.now(),
      x,
      y,
      speed: 0.5 + Math.random() * 0.8
    });
  };

  const getItemPos = (index: number, width: number, height: number) => {
    switch(index) {
      case 0: return { x: width * 0.2, y: height * 0.3 }; // Computer
      case 1: return { x: width * 0.8, y: height * 0.4 }; // Check
      case 2: return { x: width * 0.5, y: height * 0.15 }; // Cloud
      default: return { x: 0, y: 0 };
    }
  };

  const getItemIcon = (index: number) => {
    switch(index) {
      case 0: return ICONS.computer;
      case 1: return ICONS.check;
      case 2: return ICONS.cloud;
      default: return '';
    }
  };

  const getItemColor = (index: number) => {
    switch(index) {
      case 0: return COLORS.item1;
      case 1: return COLORS.item2;
      case 2: return COLORS.item3;
      default: return '#000';
    }
  };

  // Draw retro grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) => {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    // Vertical lines
    for (let x = offset % gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    // Horizontal lines
    for (let y = offset % gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now();

    // Clear with dark background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Draw Grid with slight movement
    drawGrid(ctx, width, height, time / 50);

    // --- LOGIC ---
    if (!isPaused.current) {
        let moved = false;
        const speed = 4;
        let dx = 0;
        let dy = 0;

        // 1. Keyboard Movement
        if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) dx -= 1;
        if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) dx += 1;
        if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) dy -= 1;
        if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) dy += 1;

        if (dx !== 0 || dy !== 0) {
            // Normalize vector to avoid faster diagonal movement
            const length = Math.hypot(dx, dy);
            playerPos.current.x += (dx / length) * speed;
            playerPos.current.y += (dy / length) * speed;
            moved = true;
        } 
        // 2. Mouse/Touch Movement (Only if not moved by keyboard and target exists)
        else if (targetPos.current) {
            const tx = targetPos.current.x - playerPos.current.x;
            const ty = targetPos.current.y - playerPos.current.y;
            const dist = Math.hypot(tx, ty);
            
            if (dist > 5) {
                playerPos.current.x += (tx / dist) * speed;
                playerPos.current.y += (ty / dist) * speed;
                moved = true;
            }
        }
        
        // Update Trail
        if (moved || playerTrail.current.length < 2) {
             playerTrail.current.push({ ...playerPos.current });
             if (playerTrail.current.length > 10) playerTrail.current.shift();
        }

        // Keep player in bounds
        playerPos.current.x = Math.max(20, Math.min(width - 20, playerPos.current.x));
        playerPos.current.y = Math.max(20, Math.min(height - 20, playerPos.current.y));

        // Spawn Enemies
        if (Date.now() - lastEnemySpawn.current > 2000) {
            spawnEnemy(width, height);
            lastEnemySpawn.current = Date.now();
        }

        // Check Collisions Items
        for (let i = 0; i < 3; i++) {
            const pos = getItemPos(i, width, height);
            const dist = Math.hypot(playerPos.current.x - pos.x, playerPos.current.y - pos.y);
            
            if (dist < 40 && i >= currentObjective) {
                if (i === currentObjective) {
                    onObjectiveReached();
                    return; 
                } else {
                    playSound('hit');
                    onGameOver("SYNTAX_ERROR: ¿Estás seguro de que sabes programar? Revisa el orden de ejecución.");
                    return;
                }
            }
        }

        // Enemies
        for (let i = enemies.current.length - 1; i >= 0; i--) {
            const enemy = enemies.current[i];
            const dx = playerPos.current.x - enemy.x;
            const dy = playerPos.current.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }

            if (dist < 30) {
                playSound('hit');
                onGameOver("¡OH, NO. MUERTE POR VIRUS! Es hora de hacer limpia de ese ordenador...");
                return; 
            }
        }
    }

    // --- DRAWING ---

    // 1. Draw Player Trail (Retro Neon Effect)
    if (playerTrail.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(playerTrail.current[0].x, playerTrail.current[0].y);
        for (let i = 1; i < playerTrail.current.length; i++) {
            // Bezier curve for smoothness? Or just lines for retro feel? Lines fit better.
            ctx.lineTo(playerTrail.current[i].x, playerTrail.current[i].y);
        }
        ctx.strokeStyle = COLORS.player;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    // 2. Static Ropes
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.rope;
    ctx.setLineDash([]);
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.rope;
    
    if (currentObjective > 1) {
        const p0 = getItemPos(0, width, height);
        const p1 = getItemPos(1, width, height);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
    }
    
    // 3. Active Rope
    if (currentObjective > 0) {
        const origin = getItemPos(currentObjective - 1, width, height);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(playerPos.current.x, playerPos.current.y);
        ctx.stroke();
    }
    ctx.shadowBlur = 0; // Reset shadow

    // 4. Items (Pulsing)
    for (let i = 0; i < 3; i++) {
        const pos = getItemPos(i, width, height);
        const isCompleted = i < currentObjective;
        
        // Pulse animation
        const pulse = isCompleted ? 0 : Math.sin(time / 200) * 3;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25 + pulse, 0, Math.PI * 2);
        
        if (isCompleted) {
            ctx.fillStyle = '#333'; 
            ctx.strokeStyle = '#555';
        } else {
            ctx.fillStyle = getItemColor(i);
            ctx.strokeStyle = COLORS.white;
        }
        
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Glow effect for items
        if (!isCompleted) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = getItemColor(i);
            ctx.stroke(); // Stroke again for glow
            ctx.shadowBlur = 0;
        }

        ctx.font = '30px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isCompleted ? '#777' : '#000';
        ctx.fillText(getItemIcon(i), pos.x, pos.y);
    }

    // 5. Enemies (Glitchy movement visual?)
    for (let i = 0; i < enemies.current.length; i++) {
        const enemy = enemies.current[i];
        ctx.font = '30px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Jitter text slightly for glitch effect
        const jitterX = (Math.random() - 0.5) * 2;
        const jitterY = (Math.random() - 0.5) * 2;
        ctx.fillText(ICONS.enemy, enemy.x + jitterX, enemy.y + jitterY);
    }

    // 6. Player
    ctx.font = '40px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ICONS.player, playerPos.current.x, playerPos.current.y);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [currentObjective, onGameOver, onObjectiveReached]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameLoop]);

  // Input Handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (paused) return;
    isDragging.current = true;
    targetPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (paused) return;
    if (isDragging.current) {
      targetPos.current = { x: clientX, y: clientY };
    }
  };

  const handleEnd = () => {
    isDragging.current = false;
    targetPos.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    />
  );
};