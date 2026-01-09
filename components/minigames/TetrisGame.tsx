import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../Button';
import { SoundFn } from '../../types';

interface TetrisProps {
  onComplete: () => void;
  onFail: (reason: string) => void;
  paused: boolean;
  playSound: SoundFn;
}

// 12 rows, 6 cols (Taller to allow more strategy with complex pieces)
const ROWS = 12;
const COLS = 6;
const BLOCK_SIZE = 30;
const LINES_TO_WIN = 5;

// Standard Tetrominos
const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
  [[1, 0, 0], [1, 1, 1]], // J
  [[0, 0, 1], [1, 1, 1]]  // L
];

const SHAPE_COLORS = [
  '#00FFFF', // Cyan (I)
  '#FFFF00', // Yellow (O)
  '#BD00FF', // Purple (T)
  '#39FF14', // Green (S)
  '#FF3333', // Red (Z)
  '#0000FF', // Blue (J)
  '#FFA500'  // Orange (L)
];

export const TetrisGame: React.FC<TetrisProps> = ({ onComplete, onFail, paused, playSound }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [linesCleared, setLinesCleared] = useState(0);
  const animationRef = useRef<number>(0);
  const isPaused = useRef(paused);

  useEffect(() => {
    isPaused.current = paused;
  }, [paused]);
  
  // 0 = empty, 1 = filled (we could store colors here later)
  const grid = useRef<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  
  // Current Piece State
  const piece = useRef({ 
    x: 2, 
    y: 0, 
    shape: SHAPES[0], 
    color: SHAPE_COLORS[0] 
  }); 

  const lastDropTime = useRef(0);
  const dropInterval = 600; // Slightly slower to give time to think with rotation

  const spawnPiece = () => {
    const idx = Math.floor(Math.random() * SHAPES.length);
    piece.current = {
      x: Math.floor(COLS / 2) - 1,
      y: 0,
      shape: SHAPES[idx],
      color: SHAPE_COLORS[idx]
    };

    // Immediate collision check on spawn (Game Over)
    if (checkCollision(piece.current.x, piece.current.y, piece.current.shape)) {
       onFail("¡ENTERRADO A MEJORAS! Hay que saber parar a tu PM antes de que sea tarde.");
    }
  };

  const checkCollision = (newX: number, newY: number, shapeToCheck: number[][]) => {
    for (let r = 0; r < shapeToCheck.length; r++) {
      for (let c = 0; c < shapeToCheck[r].length; c++) {
        if (shapeToCheck[r][c]) {
          const targetX = newX + c;
          const targetY = newY + r;
          
          // Wall/Floor collision
          if (targetX < 0 || targetX >= COLS || targetY >= ROWS) return true;
          
          // Grid collision
          if (targetY >= 0 && grid.current[targetY][targetX]) return true;
        }
      }
    }
    return false;
  };

  const rotatePiece = () => {
    if (isPaused.current) return;
    
    // Matrix rotation
    const currentShape = piece.current.shape;
    const newShape = currentShape[0].map((val, index) =>
      currentShape.map(row => row[index]).reverse()
    );

    // Wall kick (basic): If rotation hits something, don't rotate
    if (!checkCollision(piece.current.x, piece.current.y, newShape)) {
      piece.current.shape = newShape;
      playSound('rotate');
    } else {
      // Try shifting left/right by 1 to accommodate rotation near walls
      if (!checkCollision(piece.current.x - 1, piece.current.y, newShape)) {
        piece.current.x -= 1;
        piece.current.shape = newShape;
        playSound('rotate');
      } else if (!checkCollision(piece.current.x + 1, piece.current.y, newShape)) {
        piece.current.x += 1;
        piece.current.shape = newShape;
        playSound('rotate');
      }
    }
  };

  const lockPiece = () => {
    playSound('drop');
    for (let r = 0; r < piece.current.shape.length; r++) {
      for (let c = 0; c < piece.current.shape[r].length; c++) {
        if (piece.current.shape[r][c]) {
           if (piece.current.y + r >= 0) {
             grid.current[piece.current.y + r][piece.current.x + c] = piece.current.color;
           }
        }
      }
    }
    
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid.current[r].every(cell => cell !== null)) {
        grid.current.splice(r, 1);
        grid.current.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // Check same row index again
      }
    }
    
    if (cleared > 0) {
      playSound('line_clear');
      setLinesCleared(prev => prev + cleared);
    }

    spawnPiece();
  };

  const update = (time: number) => {
    if (isPaused.current) {
        lastDropTime.current = time; 
        return;
    }
    if (time - lastDropTime.current > dropInterval) {
      if (!checkCollision(piece.current.x, piece.current.y + 1, piece.current.shape)) {
        piece.current.y++;
      } else {
        lockPiece();
      }
      lastDropTime.current = time;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid.current[r][c]) {
          // Locked blocks
          ctx.fillStyle = grid.current[r][c]!;
          ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          
          // Retro bevel
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

        } else {
          // Empty grid lines
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }

    // Draw Active Piece
    const shape = piece.current.shape;
    ctx.fillStyle = piece.current.color;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const px = (piece.current.x + c) * BLOCK_SIZE;
          const py = (piece.current.y + r) * BLOCK_SIZE;
          
          ctx.fillRect(px, py, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          
          // Inner bright square for "neon" look
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(px + 6, py + 6, BLOCK_SIZE - 14, BLOCK_SIZE - 14);
          ctx.fillStyle = piece.current.color; // Reset
        }
      }
    }
  };

  const loop = (time: number) => {
    update(time);
    if (canvasRef.current) {
        draw(canvasRef.current.getContext('2d')!);
    }
    animationRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (linesCleared >= LINES_TO_WIN) {
      onComplete();
    }
  }, [linesCleared, onComplete]);

  useEffect(() => {
    // Initial Spawn
    spawnPiece();

    animationRef.current = requestAnimationFrame(loop);
    
    const handleKey = (e: KeyboardEvent) => {
        if (isPaused.current) return;
        
        if (e.key === 'ArrowLeft') {
            if (!checkCollision(piece.current.x - 1, piece.current.y, piece.current.shape)) piece.current.x--;
        }
        if (e.key === 'ArrowRight') {
            if (!checkCollision(piece.current.x + 1, piece.current.y, piece.current.shape)) piece.current.x++;
        }
        if (e.key === 'ArrowDown') {
            if (!checkCollision(piece.current.x, piece.current.y + 1, piece.current.shape)) piece.current.y++;
        }
        if (e.key === 'ArrowUp') {
            rotatePiece();
        }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Control buttons for mobile
  const move = (dir: 'L' | 'R' | 'D' | 'U') => {
    if (isPaused.current) return;
    if (dir === 'L' && !checkCollision(piece.current.x - 1, piece.current.y, piece.current.shape)) piece.current.x--;
    if (dir === 'R' && !checkCollision(piece.current.x + 1, piece.current.y, piece.current.shape)) piece.current.x++;
    if (dir === 'D' && !checkCollision(piece.current.x, piece.current.y + 1, piece.current.shape)) piece.current.y++;
    if (dir === 'U') rotatePiece();
  }

  return (
    <div className="flex flex-col items-center justify-center bg-black p-6 border-4 border-[#00FFFF] shadow-[0_0_20px_rgba(0,255,255,0.2)] max-w-sm w-full">
      <h2 className="text-xl font-bold mb-2 text-[#00FFFF] font-mono text-center">REFACTOR_CODE_V2.EXE</h2>
      <p className="text-sm text-[#39FF14] mb-4 font-mono">OBJETIVO: LIMPIA {LINES_TO_WIN} FILAS</p>
      
      <canvas 
        ref={canvasRef} 
        width={COLS * BLOCK_SIZE} 
        height={ROWS * BLOCK_SIZE} 
        className="bg-[#111] border border-[#333] mb-4 shadow-inner"
      />
      
      <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
        <div className="col-start-2">
            <Button onClick={() => move('U')} className="w-full py-2 px-0 text-sm">↻</Button>
        </div>
        <div className="col-start-1 row-start-2">
            <Button onClick={() => move('L')} className="w-full py-2 px-0 text-sm">{'<'}</Button>
        </div>
        <div className="col-start-2 row-start-2">
            <Button onClick={() => move('D')} className="w-full py-2 px-0 text-sm">{'V'}</Button>
        </div>
        <div className="col-start-3 row-start-2">
            <Button onClick={() => move('R')} className="w-full py-2 px-0 text-sm">{'>'}</Button>
        </div>
      </div>

      <div className="mt-4 font-bold text-[#39FF14] font-mono text-sm">
        PROGRESS: [{Array(Math.min(linesCleared, LINES_TO_WIN)).fill('#').join('')}{Array(Math.max(0, LINES_TO_WIN - linesCleared)).fill('_').join('')}]
      </div>
    </div>
  );
};
