import { useEffect, useRef, useState } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from '../types';

export type TrackerStatus = 'idle' | 'requesting' | 'loading-model' | 'ready' | 'error';

export function usePoseTracker(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean,
  onFrame: (frame: PoseFrame) => void,
  instanceKey: string,
) {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [error, setError] = useState('');
  const callbackRef = useRef(onFrame);
  callbackRef.current = onFrame;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    const videoElement: HTMLVideoElement = currentVideo;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let poseLandmarker: PoseLandmarker | null = null;
    let frameId = 0;
    let lastVideoTime = -1;

    async function start() {
      try {
        setError('');
        setStatus('requesting');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return;
        videoElement.srcObject = stream;
        await videoElement.play();
        setStatus('loading-model');
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm',
        );
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) return;
        setStatus('ready');

        const detect = () => {
          const video = videoElement;
          if (!cancelled && video && poseLandmarker) {
            if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
              lastVideoTime = video.currentTime;
              const timestamp = performance.now();
              const result = poseLandmarker.detectForVideo(video, timestamp);
              if (result.landmarks[0]) callbackRef.current({ timestamp, landmarks: result.landmarks[0] });
            }
            frameId = requestAnimationFrame(detect);
          }
        };
        detect();
      } catch (cause) {
        if (cancelled) return;
        const message = cause instanceof Error ? cause.message : 'Could not start camera tracking.';
        setError(message.includes('Permission') ? 'Camera permission was not granted.' : message);
        setStatus('error');
      }
    }

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
      poseLandmarker?.close();
      videoElement.srcObject = null;
    };
  }, [enabled, videoRef, instanceKey]);

  return { status, error };
}
