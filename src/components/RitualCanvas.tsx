import { useEffect, useRef } from 'react';
import type { RepPhase } from '../game/repMachine';
import { biomeForSeed, createExpedition, stepExpedition, type ExpeditionState } from '../simulation/expedition';
import { RITUAL_STOPS, ritualRoutePoint } from '../simulation/ritual';
import type { PetAsset } from '../types';

export interface CanvasPerformance {
  fps: number;
  averageFrameMs: number;
  p95FrameMs: number;
  particleCount: number;
}

interface RitualCanvasProps {
  pet: PetAsset;
  reps: number;
  completed: boolean;
  phase: RepPhase;
  armAngle: number;
  targetAngle: number;
  seed: number;
  onPerformance?: (performance: CanvasPerformance) => void;
  onState?: (state: ExpeditionState) => void;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha = 1) {
  context.save();
  context.translate(x, y);
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const distance = index % 2 === 0 ? radius : radius * 0.43;
    context.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function routePoint(progress: number, width: number, height: number) {
  const point = ritualRoutePoint(progress);
  return { x: point.x * width, y: point.y * height, scale: point.scale };
}

function drawHouse(context: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string, lit: boolean) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = 'rgba(54,63,65,.14)';
  context.beginPath();
  context.ellipse(0, 20, 35, 10, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = color;
  roundedRect(context, -28, -31, 56, 49, 8);
  context.fill();
  context.fillStyle = '#7a4d3c';
  context.beginPath();
  context.moveTo(-36, -27);
  context.lineTo(0, -55);
  context.lineTo(36, -27);
  context.closePath();
  context.fill();
  context.fillStyle = lit ? '#ffe398' : '#c7ded5';
  roundedRect(context, -18, -19, 14, 17, 3);
  context.fill();
  roundedRect(context, 5, -19, 14, 17, 3);
  context.fill();
  context.fillStyle = '#4d776d';
  roundedRect(context, -7, -2, 15, 20, 4);
  context.fill();
  context.restore();
}

function drawTree(context: CanvasRenderingContext2D, x: number, y: number, scale: number, sway: number) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.rotate(sway);
  context.fillStyle = '#805947';
  roundedRect(context, -3, -25, 6, 34, 3);
  context.fill();
  context.fillStyle = '#6d9c7d';
  [-19, 0, 19].forEach((offset, index) => {
    context.beginPath();
    context.ellipse(offset * 0.45, -38 - index * 4, 19, 25, offset * 0.012, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawStop(context: CanvasRenderingContext2D, index: number, x: number, y: number, scale: number, reps: number, time: number) {
  const stop = RITUAL_STOPS[index];
  const earned = index === 0 || reps >= index;
  const next = index === Math.min(3, reps + 1);
  const pulse = next ? 1 + Math.sin(time * 4) * 0.08 : 1;
  context.save();
  context.translate(x, y);
  context.scale(scale * pulse, scale * pulse);
  if (next) {
    context.fillStyle = 'rgba(255,215,120,.22)';
    context.beginPath();
    context.arc(0, -19, 38, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = earned ? stop.color : '#aabbb4';
  context.strokeStyle = 'rgba(255,255,255,.85)';
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, -18, 18, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = '#fffdf7';
  context.font = '900 17px Nunito, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(earned && index > 0 ? '✓' : stop.icon, 0, -18);
  context.fillStyle = 'rgba(50,63,61,.82)';
  context.font = '900 10px Nunito, sans-serif';
  context.fillText(stop.shortName.toUpperCase(), 0, 12);
  context.restore();
}

function drawDemoPet(context: CanvasRenderingContext2D, x: number, y: number, size: number, state: ExpeditionState) {
  const motion = state.petMotion;
  const walking = motion === 'leap' || motion === 'charge';
  const bounce = motion === 'celebrate' ? Math.sin(state.time * 11) * 6 : walking ? Math.abs(Math.sin(state.time * 10)) * -4 : Math.sin(state.time * 2.5) * 1.5;
  const rotation = walking ? Math.sin(state.time * 9) * 0.045 : motion === 'celebrate' ? Math.sin(state.time * 10) * 0.1 : 0;
  context.save();
  context.translate(x, y + bounce);
  context.rotate(rotation);
  context.shadowColor = 'rgba(50,63,61,.2)';
  context.shadowBlur = 12;
  context.fillStyle = '#f3a48d';
  context.beginPath();
  context.ellipse(0, 0, size * 0.34, size * 0.39, 0, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(-size * 0.27, -size * 0.2);
  context.lineTo(-size * 0.31, -size * 0.48);
  context.lineTo(-size * 0.08, -size * 0.34);
  context.moveTo(size * 0.27, -size * 0.2);
  context.lineTo(size * 0.31, -size * 0.48);
  context.lineTo(size * 0.08, -size * 0.34);
  context.fill();
  context.strokeStyle = '#34445f';
  context.lineWidth = Math.max(2, size * 0.035);
  context.lineCap = 'round';
  const blink = Math.sin(state.time * 1.8) > 0.97 ? 0 : size * 0.03;
  context.beginPath();
  context.moveTo(-size * 0.13, -size * 0.05);
  context.lineTo(-size * 0.08, -size * 0.05 + blink);
  context.moveTo(size * 0.13, -size * 0.05);
  context.lineTo(size * 0.08, -size * 0.05 + blink);
  context.stroke();
  context.fillStyle = '#fff8e9';
  roundedRect(context, -size * 0.3, size * 0.2, size * 0.6, size * 0.14, size * 0.06);
  context.fill();
  context.fillStyle = '#68a9a0';
  roundedRect(context, -size * 0.24, size * 0.18, size * 0.48, size * 0.1, size * 0.04);
  context.fill();
  context.restore();
}

function drawUploadedPet(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, size: number, state: ExpeditionState) {
  const walking = state.petMotion === 'leap' || state.petMotion === 'charge';
  const bounce = state.petMotion === 'celebrate' ? Math.sin(state.time * 11) * 6 : walking ? Math.abs(Math.sin(state.time * 10)) * -4 : 0;
  context.save();
  context.translate(x, y + bounce);
  context.rotate(walking ? Math.sin(state.time * 9) * 0.045 : 0);
  context.shadowColor = 'rgba(50,63,61,.22)';
  context.shadowBlur = 12;
  roundedRect(context, -size / 2, -size / 2, size, size, size * 0.36);
  context.clip();
  context.drawImage(image, -size / 2, -size / 2, size, size);
  context.restore();
  context.save();
  context.translate(x, y + bounce);
  context.strokeStyle = '#fffdf7';
  context.lineWidth = 5;
  roundedRect(context, -size / 2, -size / 2, size, size, size * 0.36);
  context.stroke();
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, state: ExpeditionState, width: number, height: number, petImage: HTMLImageElement | null, reps: number) {
  const compact = width < 560;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#f8f0dc');
  sky.addColorStop(0.6, '#e5f3e8');
  sky.addColorStop(1, '#b7d8cf');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255,205,112,.72)';
  context.beginPath();
  context.arc(width * 0.82, height * 0.19, Math.max(27, width * 0.045), 0, Math.PI * 2);
  context.fill();

  context.save();
  context.globalAlpha = 0.25;
  context.strokeStyle = '#fffdf5';
  context.lineWidth = 18;
  context.beginPath();
  context.arc(width * 0.5, height * 0.82, width * 0.55, Math.PI * 1.09, Math.PI * 1.91);
  context.stroke();
  context.restore();

  context.fillStyle = '#79a88d';
  context.beginPath();
  context.ellipse(width * 0.5, height * 1.03, width * 0.58, height * 0.67, 0, Math.PI, Math.PI * 2);
  context.fill();
  context.fillStyle = '#a9c69a';
  context.beginPath();
  context.ellipse(width * 0.5, height * 1.08, width * 0.55, height * 0.62, 0, Math.PI, Math.PI * 2);
  context.fill();

  drawHouse(context, width * 0.23, height * 0.48, compact ? 0.56 : 0.72, '#d79a78', reps >= 1);
  drawHouse(context, width * 0.74, height * 0.45, compact ? 0.52 : 0.68, '#8fb5a2', reps >= 2);
  drawTree(context, width * 0.1, height * 0.61, compact ? 0.56 : 0.74, Math.sin(state.time * 0.8) * 0.02);
  drawTree(context, width * 0.9, height * 0.58, compact ? 0.5 : 0.68, Math.sin(state.time * 0.8 + 1) * 0.02);

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = 'rgba(92,91,72,.18)';
  context.lineWidth = compact ? 20 : 28;
  context.beginPath();
  for (let index = 0; index <= 36; index += 1) {
    const point = routePoint((index / 36) * 3, width, height);
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.stroke();
  context.strokeStyle = '#f3e7c9';
  context.lineWidth = compact ? 14 : 20;
  context.stroke();
  context.setLineDash([4, 10]);
  context.strokeStyle = 'rgba(255,255,255,.68)';
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  RITUAL_STOPS.forEach((_, index) => {
    const point = routePoint(index, width, height);
    drawStop(context, index, point.x, point.y, (compact ? 0.82 : 1) * point.scale, reps, state.time);
  });

  const petPoint = routePoint(state.petProgress, width, height);
  const petSize = Math.max(48, Math.min(76, width * 0.085)) * petPoint.scale;
  context.fillStyle = 'rgba(49,63,60,.18)';
  context.beginPath();
  context.ellipse(petPoint.x, petPoint.y + petSize * 0.34, petSize * 0.34, petSize * 0.1, 0, 0, Math.PI * 2);
  context.fill();
  if (petImage) drawUploadedPet(context, petImage, petPoint.x, petPoint.y - petSize * 0.18, petSize, state);
  else drawDemoPet(context, petPoint.x, petPoint.y - petSize * 0.18, petSize, state);

  state.particles.forEach((particle) => {
    const alpha = particle.kind === 'snow' ? 0.34 : Math.max(0, particle.life / particle.maxLife);
    const x = particle.x * width;
    const y = particle.y * height;
    if (particle.kind === 'star') drawStar(context, x, y, particle.size, '#ffd477', alpha);
    else {
      context.globalAlpha = alpha;
      context.fillStyle = particle.kind === 'snow' ? '#fff9dc' : '#ffd477';
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  });

  context.fillStyle = 'rgba(255,253,245,.84)';
  roundedRect(context, 16, 15, compact ? 150 : 230, 30, 15);
  context.fill();
  context.fillStyle = '#526a61';
  context.font = '900 11px Nunito, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText(`${state.biome.name.toUpperCase()} · MORNING ROUTE`, 29, 35);
}

export function RitualCanvas({ pet, reps, completed, phase, armAngle, targetAngle, seed, onPerformance, onState }: RitualCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createExpedition(seed));
  const inputRef = useRef({ reps, completed, phase, armAngle, targetAngle });
  const callbacksRef = useRef({ onPerformance, onState });
  const imageRef = useRef<HTMLImageElement | null>(null);
  inputRef.current = { reps, completed, phase, armAngle, targetAngle };
  callbacksRef.current = { onPerformance, onState };

  useEffect(() => {
    stateRef.current = createExpedition(seed);
  }, [seed]);

  useEffect(() => {
    imageRef.current = null;
    if (!pet.imageUrl) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = pet.imageUrl;
    image.onload = () => {
      imageRef.current = image;
    };
  }, [pet.imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let animationFrame = 0;
    let previous = performance.now();
    let reportAt = previous;
    let frames = 0;
    let frameIntervals: number[] = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (now: number) => {
      const frameMs = now - previous;
      previous = now;
      stateRef.current = stepExpedition(stateRef.current, inputRef.current, frameMs / 1000);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawScene(context, stateRef.current, width, height, imageRef.current, inputRef.current.reps);
      frames += 1;
      frameIntervals.push(frameMs);
      if (frameIntervals.length > 120) frameIntervals.shift();
      if (now - reportAt >= 1000) {
        const sorted = [...frameIntervals].sort((a, b) => a - b);
        const averageFrameMs = frameIntervals.reduce((sum, value) => sum + value, 0) / Math.max(1, frameIntervals.length);
        callbacksRef.current.onPerformance?.({
          fps: Math.round((frames * 1000) / (now - reportAt)),
          averageFrameMs,
          p95FrameMs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0,
          particleCount: stateRef.current.particles.length,
        });
        callbacksRef.current.onState?.(stateRef.current);
        frames = 0;
        reportAt = now;
        frameIntervals = [];
      }
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={`${pet.name} carrying warmth across ${biomeForSeed(seed).name}; ${reps} of 3 deliveries complete`}
    />
  );
}
