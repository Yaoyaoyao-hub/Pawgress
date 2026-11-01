import { useEffect, useRef } from 'react';
import type { RepPhase } from '../game/repMachine';
import {
  createExpedition,
  biomeForSeed,
  progressPosition,
  stepExpedition,
  waterHeight,
  type ExpeditionState,
} from '../simulation/expedition';
import type { PetAsset } from '../types';

export interface CanvasPerformance {
  fps: number;
  averageFrameMs: number;
  p95FrameMs: number;
  particleCount: number;
}

interface ArcticCanvasProps {
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

const platformStops = [0, 1, 2];

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

function drawDemoPet(context: CanvasRenderingContext2D, x: number, y: number, size: number, state: ExpeditionState) {
  const motion = state.petMotion;
  const bounce = motion === 'celebrate' ? Math.sin(state.time * 11) * 7 : Math.sin(state.time * 2.5) * 1.5;
  const squashX = motion === 'charge' ? 1.08 : motion === 'land' ? 1.16 : 1;
  const squashY = motion === 'charge' ? 0.88 : motion === 'land' ? 0.82 : 1;
  const rotation = motion === 'leap' ? -0.09 : motion === 'celebrate' ? Math.sin(state.time * 10) * 0.1 : 0;
  context.save();
  context.translate(x, y + bounce);
  context.rotate(rotation);
  context.scale(squashX, squashY);
  context.shadowColor = 'rgba(40,73,104,.22)';
  context.shadowBlur = 12;
  context.fillStyle = '#fff';
  context.beginPath();
  context.ellipse(0, 3, size * 0.38, size * 0.42, 0, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = '#f4a38f';
  context.beginPath();
  context.ellipse(0, 2, size * 0.33, size * 0.37, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(-size * 0.27, -size * 0.2);
  context.lineTo(-size * 0.31, -size * 0.49);
  context.lineTo(-size * 0.08, -size * 0.34);
  context.moveTo(size * 0.27, -size * 0.2);
  context.lineTo(size * 0.31, -size * 0.49);
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
  context.fillStyle = '#ef6f77';
  context.beginPath();
  context.arc(0, size * 0.04, size * 0.035, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#fff';
  context.lineWidth = size * 0.11;
  context.beginPath();
  context.moveTo(-size * 0.22, size * 0.27);
  context.lineTo(size * 0.22, size * 0.27);
  context.stroke();
  context.fillStyle = '#68c7c9';
  context.beginPath();
  context.moveTo(-size * 0.16, size * 0.21);
  context.lineTo(0, size * 0.34);
  context.lineTo(size * 0.16, size * 0.21);
  context.fill();
  context.restore();
}

function drawUploadedPet(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  state: ExpeditionState,
) {
  const motion = state.petMotion;
  const bounce = motion === 'celebrate' ? Math.sin(state.time * 11) * 7 : 0;
  const squashX = motion === 'charge' ? 1.08 : motion === 'land' ? 1.16 : 1;
  const squashY = motion === 'charge' ? 0.88 : motion === 'land' ? 0.82 : 1;
  context.save();
  context.translate(x, y + bounce);
  context.rotate(motion === 'leap' ? -0.08 : 0);
  context.scale(squashX, squashY);
  context.beginPath();
  context.roundRect(-size / 2, -size / 2, size, size, size * 0.35);
  context.clip();
  context.drawImage(image, -size / 2, -size / 2, size, size);
  context.restore();
  context.save();
  context.translate(x, y + bounce);
  context.strokeStyle = '#fff';
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-size / 2, -size / 2, size, size, size * 0.35);
  context.stroke();
  context.restore();
}

function drawBiomeLandmark(context: CanvasRenderingContext2D, state: ExpeditionState, width: number, horizon: number) {
  const { biome } = state;
  context.save();
  if (biome.landmark === 'moon') {
    context.fillStyle = '#fff3b4';
    context.shadowColor = '#fff3b4';
    context.shadowBlur = 28;
    context.beginPath();
    context.arc(width * 0.12, horizon * 0.22, Math.max(22, width * 0.035), 0, Math.PI * 2);
    context.fill();
  } else if (biome.landmark === 'crystals') {
    context.fillStyle = '#b7f2ff';
    for (let index = 0; index < 4; index += 1) {
      const x = width * (0.73 + index * 0.035);
      const height = 35 + index % 2 * 24;
      context.beginPath();
      context.moveTo(x, horizon - 5);
      context.lineTo(x + 12, horizon - height);
      context.lineTo(x + 24, horizon - 5);
      context.fill();
    }
  } else if (biome.landmark === 'seal') {
    context.fillStyle = '#70869a';
    context.beginPath();
    context.ellipse(width * 0.78, horizon - 13, 25, 15, -0.15, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(width * 0.81, horizon - 27, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#263a4c';
    context.beginPath();
    context.arc(width * 0.807, horizon - 30, 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.fillStyle = '#6ea995';
    for (let index = 0; index < 3; index += 1) {
      const x = width * (0.7 + index * 0.08);
      context.beginPath();
      context.moveTo(x, horizon - 55);
      context.lineTo(x - 23, horizon - 5);
      context.lineTo(x + 23, horizon - 5);
      context.fill();
    }
  }
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  state: ExpeditionState,
  width: number,
  height: number,
  petImage: HTMLImageElement | null,
  reps: number,
) {
  const { biome } = state;
  const horizon = height * 0.57;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, biome.skyTop);
  sky.addColorStop(0.68, biome.skyBottom);
  sky.addColorStop(1, biome.waterBottom);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.17 + state.charge * 0.18;
  biome.aurora.forEach((color, index) => {
    context.strokeStyle = color;
    context.lineWidth = Math.max(18, height * 0.07);
    context.beginPath();
    for (let point = 0; point <= 8; point += 1) {
      const x = (point / 8) * width;
      const y = height * (0.16 + index * 0.07) + Math.sin(point * 0.9 + state.time * 0.35 + index) * 22;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  });
  context.restore();

  context.fillStyle = 'rgba(109,151,178,.18)';
  context.beginPath();
  context.moveTo(0, horizon);
  for (let index = 0; index <= 8; index += 1) {
    const x = (index / 8) * width;
    const y = horizon - 42 - Math.sin(index * 2.1 + 0.5) * 26;
    context.lineTo(x, y);
  }
  context.lineTo(width, horizon);
  context.closePath();
  context.fill();
  drawBiomeLandmark(context, state, width, horizon);

  const water = context.createLinearGradient(0, horizon, 0, height);
  water.addColorStop(0, biome.waterTop);
  water.addColorStop(1, biome.waterBottom);
  context.fillStyle = water;
  context.fillRect(0, horizon, width, height - horizon);
  context.strokeStyle = 'rgba(255,255,255,.28)';
  context.lineWidth = 2;
  for (let wave = 0; wave < 5; wave += 1) {
    context.beginPath();
    for (let x = 0; x <= width; x += 18) {
      const y = horizon + 25 + wave * 28 + Math.sin(x * 0.022 + state.time * 1.2 + wave) * 5;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  state.ripples.forEach((ripple) => {
    const alpha = 1 - ripple.age / 1.2;
    context.strokeStyle = `rgba(255,255,255,${alpha * 0.65})`;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(ripple.x * width, horizon + 34, ripple.age * 52, ripple.age * 13, 0, 0, Math.PI * 2);
    context.stroke();
  });

  platformStops.forEach((stop, index) => {
    const x = progressPosition(stop) * width;
    const bob = waterHeight(x / width, state.time) * height + state.platformSprings[index].offset * 24;
    const y = horizon + 29 + bob;
    context.fillStyle = 'rgba(51,108,137,.22)';
    context.beginPath();
    context.ellipse(x, y + 15, width * 0.085, height * 0.027, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#8fd2df';
    context.beginPath();
    context.ellipse(x, y + 7, width * 0.082, height * 0.026, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#d9f8ff';
    context.beginPath();
    context.ellipse(x, y, width * 0.082, height * 0.026, 0, 0, Math.PI * 2);
    context.fill();
  });

  const islandX = progressPosition(3) * width;
  context.fillStyle = '#8cc797';
  context.beginPath();
  context.ellipse(islandX + width * 0.04, horizon + 20, width * 0.16, height * 0.11, -0.1, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#d9f9e2';
  context.beginPath();
  context.ellipse(islandX, horizon + 2, width * 0.13, height * 0.055, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#5c936f';
  context.fillRect(islandX + 28, horizon - 49, 4, 52);
  context.fillStyle = '#ef8c8c';
  context.beginPath();
  context.moveTo(islandX + 32, horizon - 49);
  context.lineTo(islandX + 66, horizon - 39);
  context.lineTo(islandX + 32, horizon - 28);
  context.fill();

  [1, 2, 3].forEach((rep) => {
    const x = progressPosition(rep) * width;
    drawStar(context, x, horizon - 72, Math.max(7, width * 0.011), reps >= rep ? biome.accent : 'rgba(218,232,236,.65)', reps >= rep ? 1 : 0.7);
  });

  const petX = progressPosition(state.petProgress) * width;
  const segment = Math.min(2, Math.floor(state.petProgress));
  const fraction = state.petProgress - segment;
  const leapHeight = Math.sin(fraction * Math.PI) * Math.min(100, height * 0.24);
  const baseY = horizon - 21 + waterHeight(petX / width, state.time) * height;
  const petY = baseY - leapHeight - Math.min(42, width * 0.05);
  context.fillStyle = `rgba(38,72,101,${0.18 - Math.min(0.1, leapHeight / 900)})`;
  context.beginPath();
  context.ellipse(petX, baseY + 30, width * 0.035 + leapHeight * 0.08, height * 0.018, 0, 0, Math.PI * 2);
  context.fill();
  const petSize = Math.max(54, Math.min(82, width * 0.09));
  if (petImage) drawUploadedPet(context, petImage, petX, petY, petSize, state);
  else drawDemoPet(context, petX, petY, petSize, state);

  state.particles.forEach((particle) => {
    const alpha = particle.kind === 'snow' ? 0.65 : Math.max(0, particle.life / particle.maxLife);
    const x = particle.x * width;
    const y = particle.y * height;
    if (particle.kind === 'star') drawStar(context, x, y, particle.size, biome.accent, alpha);
    else {
      context.globalAlpha = alpha;
      context.fillStyle = particle.kind === 'snow' ? '#fff' : biome.accent;
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  });

  context.fillStyle = 'rgba(255,255,255,.78)';
  roundedRect(context, 16, 15, 136, 29, 15);
  context.fill();
  context.fillStyle = '#4c6579';
  context.font = '800 11px Nunito, sans-serif';
  context.fillText(biome.name.toUpperCase(), 30, 34);
}

export function ArcticCanvas({
  pet,
  reps,
  completed,
  phase,
  armAngle,
  targetAngle,
  seed,
  onPerformance,
  onState,
}: ArcticCanvasProps) {
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
      aria-label={`${pet.name} crossing ${biomeForSeed(seed).name}; ${reps} of 3 repetitions complete`}
    />
  );
}
