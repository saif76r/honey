import React, { useEffect, useRef } from 'react';
import { ThemePreset } from '../types/chat';

interface FloatingHeartsCanvasProps {
  enabled: boolean;
  type?: 'hearts' | 'petals' | 'sparkles';
  theme: ThemePreset;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  swaySpeed: number;
  swayOffset: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

export const FloatingHeartsCanvas: React.FC<FloatingHeartsCanvasProps> = ({
  enabled,
  type = 'hearts',
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 6 : 14;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: isMobile ? Math.random() * 8 + 6 : Math.random() * 10 + 8,
        speedY: isMobile ? Math.random() * 0.3 + 0.15 : Math.random() * 0.4 + 0.2,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayOffset: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.3 + 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
      });
    }

    const getParticleColor = (opacity: number) => {
      switch (theme) {
        case 'lavender':
          return `rgba(155, 126, 201, ${opacity})`;
        case 'peach':
          return `rgba(224, 125, 96, ${opacity})`;
        case 'mint':
          return `rgba(85, 158, 129, ${opacity})`;
        case 'twilight':
          return `rgba(115, 124, 197, ${opacity})`;
        case 'rose':
        default:
          return `rgba(223, 109, 133, ${opacity})`;
      }
    };

    const drawHeart = (x: number, y: number, size: number, color: string, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = color;
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      // top left curve
      ctx.bezierCurveTo(
        -size / 2,
        -size / 2,
        -size,
        topCurveHeight / 3,
        0,
        size
      );
      // top right curve
      ctx.bezierCurveTo(
        size,
        topCurveHeight / 3,
        size / 2,
        -size / 2,
        0,
        topCurveHeight
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawPetal = (x: number, y: number, size: number, color: string, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.4, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick++;

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += Math.sin(tick * p.swaySpeed + p.swayOffset) * 0.5;
        p.rotation += p.rotationSpeed;

        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }

        const color = getParticleColor(p.opacity);
        if (type === 'petals') {
          drawPetal(p.x, p.y, p.size, color, p.rotation);
        } else {
          drawHeart(p.x, p.y, p.size, color, p.rotation);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, type, theme]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 opacity-70"
      aria-hidden="true"
    />
  );
};
