import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Dices,
  Ghost,
  ImagePlus,
  Info,
  PawPrint,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
} from 'lucide-react';
import { GameScene } from './components/GameScene';
import { MetricRing } from './components/MetricRing';
import { PetAvatar } from './components/PetAvatar';
import { PoseOverlay } from './components/PoseOverlay';
import { ProgressHeader } from './components/ProgressHeader';
import { FeedbackGate, makeFeedbackEvent } from './game/feedback';
import { initialRepState, updateRepState } from './game/repMachine';
import { requestDecision } from './services/decisionAdapter';
import { clearSessions, loadSessions, saveSession } from './services/sessionStorage';
import { voiceCoach } from './services/voice';
import { calculateMotionMetrics, smoothMetrics } from './tracking/poseMath';
import { usePoseTracker } from './tracking/usePoseTracker';
import type {
  AppStep,
  FeedbackEvent,
  InputMode,
  Landmark,
  MotionMetrics,
  PetAsset,
  RecordedFrame,
  RepConfig,
  SessionSummary,
} from './types';

const demoPet: PetAsset = { name: 'Mochi', kind: 'demo' };
const emptyMetrics: MotionMetrics = {
  armAngle: 0,
  trunkLean: 0,
  confidence: 0,
  trackingValid: false,
  side: 'left',
};

const stageForStep: Record<AppStep, number> = {
  welcome: 0,
  pet: 0,
  calibrate: 1,
  game: 2,
  summary: 3,
};

function App() {
  const [step, setStep] = useState<AppStep>('welcome');
  const [pet, setPet] = useState<PetAsset>(demoPet);
  const [petName, setPetName] = useState('Mochi');
  const [uploadError, setUploadError] = useState('');
  const [mode, setMode] = useState<InputMode>('demo');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [targetAngle, setTargetAngle] = useState(85);
  const [metrics, setMetrics] = useState<MotionMetrics>(emptyMetrics);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [completed, setCompleted] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ghostMode, setGhostMode] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>(() => loadSessions());

  const videoRef = useRef<HTMLVideoElement>(null);
  const repStateRef = useRef(initialRepState());
  const smoothRef = useRef<MotionMetrics | null>(null);
  const recordingRef = useRef<RecordedFrame[]>([]);
  const startTimeRef = useRef(0);
  const lastRecordedAtRef = useRef(-Infinity);
  const peakAngleRef = useRef(0);
  const maxTrunkRef = useRef(0);
  const feedbackGateRef = useRef(new FeedbackGate());
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const config = useMemo<RepConfig>(
    () => ({ targetAngle, resetAngle: 30, trunkLimit: 15, targetHoldMs: 180, trackingConfidence: 0.55 }),
    [targetAngle],
  );

  useEffect(() => {
    voiceCoach.setEnabled(!muted);
  }, [muted]);

  useEffect(
    () => () => {
      timersRef.current.forEach(window.clearTimeout);
    },
    [],
  );

  const emitFeedback = useCallback((event: FeedbackEvent) => {
    setFeedback(event);
    voiceCoach.speak(event);
    void requestDecision(event).then((result) => {
      if (result.source === 'adapter' && result.message !== event.message) {
        setFeedback((current) => (current?.id === event.id ? { ...current, message: result.message } : current));
      }
    });
  }, []);

  const finishSession = useCallback(
    (finalMetrics: MotionMetrics) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setCompleted(true);
      const now = performance.now();
      emitFeedback(
        makeFeedbackEvent('SESSION_COMPLETED', now, {
          rep: 3,
          metrics: { armAngle: finalMetrics.armAngle, trunkLean: finalMetrics.trunkLean },
        }),
      );
      const timer = window.setTimeout(() => {
        const result: SessionSummary = {
          id: `session-${Date.now()}`,
          completedAt: new Date().toISOString(),
          reps: 3,
          peakArmAngle: Math.max(peakAngleRef.current, finalMetrics.armAngle),
          maxTrunkLean: Math.max(maxTrunkRef.current, finalMetrics.trunkLean),
          mode,
          petName: pet.name,
          durationSeconds: Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000)),
          recording: recordingRef.current,
        };
        saveSession(result);
        setSummary(result);
        setSessionHistory(loadSessions());
        setStep('summary');
      }, 1500);
      timersRef.current.push(timer);
    },
    [emitFeedback, mode, pet.name],
  );

  const processMotion = useCallback(
    (nextMetrics: MotionMetrics, nextLandmarks: Landmark[], timestamp: number) => {
      const smoothed = mode === 'camera' ? smoothMetrics(smoothRef.current, nextMetrics) : nextMetrics;
      smoothRef.current = smoothed;
      setMetrics(smoothed);
      if (nextLandmarks.length) setLandmarks(nextLandmarks);

      if (smoothed.trackingValid) {
        peakAngleRef.current = Math.max(peakAngleRef.current, smoothed.armAngle);
        maxTrunkRef.current = Math.max(maxTrunkRef.current, smoothed.trunkLean);
        if (timestamp - lastRecordedAtRef.current >= 90) {
          recordingRef.current.push({ timestamp: timestamp - startTimeRef.current, landmarks: nextLandmarks, metrics: smoothed });
          lastRecordedAtRef.current = timestamp;
        }
      } else if (feedbackGateRef.current.allow('TRACKING_LOST', timestamp, 4500)) {
        emitFeedback(makeFeedbackEvent('TRACKING_LOST', timestamp));
      }

      if (smoothed.trackingValid && smoothed.trunkLean > config.trunkLimit && feedbackGateRef.current.allow('TRUNK_DEVIATION', timestamp, 4000)) {
        emitFeedback(makeFeedbackEvent('TRUNK_DEVIATION', timestamp, { metrics: smoothed }));
      }

      const update = updateRepState(repStateRef.current, smoothed, timestamp, config);
      repStateRef.current = update.state;
      if (update.targetReachedNow) {
        emitFeedback(makeFeedbackEvent('TARGET_REACHED', timestamp, { metrics: smoothed }));
      }
      if (update.repCompletedNow) {
        setReps(update.state.reps);
        emitFeedback(makeFeedbackEvent('REP_COMPLETED', timestamp, { rep: update.state.reps, metrics: smoothed }));
        if (update.state.reps >= 3) finishSession(smoothed);
      }
    },
    [config, emitFeedback, finishSession, mode],
  );

  const onPoseFrame = useCallback(
    (frame: { timestamp: number; landmarks: Landmark[] }) => {
      const raw = calculateMotionMetrics(frame.landmarks, config.trackingConfidence);
      if (step === 'game') processMotion(raw, frame.landmarks, frame.timestamp);
      else {
        setMetrics(smoothMetrics(smoothRef.current, raw));
        smoothRef.current = raw;
        setLandmarks(frame.landmarks);
      }
    },
    [config.trackingConfidence, processMotion, step],
  );

  const tracker = usePoseTracker(videoRef, cameraEnabled && (step === 'calibrate' || step === 'game'), onPoseFrame, step);

  const resetSession = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    repStateRef.current = initialRepState();
    smoothRef.current = null;
    recordingRef.current = [];
    lastRecordedAtRef.current = -Infinity;
    peakAngleRef.current = 0;
    maxTrunkRef.current = 0;
    feedbackGateRef.current.reset();
    finishedRef.current = false;
    startTimeRef.current = performance.now();
    setMetrics(emptyMetrics);
    setLandmarks([]);
    setReps(0);
    setCompleted(false);
    setDemoBusy(false);
    const event = makeFeedbackEvent('START', performance.now());
    emitFeedback(event);
  }, [emitFeedback]);

  const startGame = (inputMode: InputMode) => {
    setMode(inputMode);
    setStep('game');
    window.setTimeout(resetSession, 0);
  };

  const runDemoRep = () => {
    if (demoBusy || completed) return;
    setDemoBusy(true);
    const now = performance.now();
    const frames: Array<[number, number]> = [
      [0, 20],
      [80, 52],
      [160, targetAngle + 8],
      [380, targetAngle + 10],
      [540, Math.max(45, targetAngle - 22)],
      [730, 20],
    ];
    frames.forEach(([delay, armAngle], index) => {
      const timer = window.setTimeout(() => {
        processMotion({ armAngle, trunkLean: index === 1 ? 2.5 : 1.2, confidence: 1, trackingValid: true, side: 'left' }, [], now + delay);
        if (index === frames.length - 1) setDemoBusy(false);
      }, delay);
      timersRef.current.push(timer);
    });
  };

  const handleUpload = (file?: File) => {
    setUploadError('');
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Please choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('That file is over 5 MB. Choose a smaller image.');
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    const fallbackName = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'My Pet';
    setPetName(fallbackName);
    setPet({ name: fallbackName, imageUrl, kind: 'upload' });
  };

  const ghostFrame = useMemo(() => {
    const previous = sessionHistory.find((session) => session.id !== summary?.id && session.recording.some((frame) => frame.landmarks.length));
    if (!ghostMode || !previous?.recording.length) return null;
    const frameIndex = Math.min(previous.recording.length - 1, Math.floor((metrics.armAngle / 180) * previous.recording.length));
    return previous.recording[frameIndex];
  }, [ghostMode, metrics.armAngle, sessionHistory, summary?.id]);

  const previousSession = sessionHistory.find((session) => session.id !== summary?.id);

  return (
    <div className="min-h-screen overflow-x-hidden text-[#35435f]">
      <div className="aurora" aria-hidden="true" />
      {step !== 'welcome' && <ProgressHeader stage={stageForStep[step]} muted={muted} onMute={() => setMuted((value) => !value)} />}

      {step === 'welcome' && (
        <main className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <section className="relative z-10">
            <div className="mb-8 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[1.1rem] bg-[#ef8c8c] text-2xl shadow-lg shadow-[#ef8c8c]/20">🐾</span>
              <span className="font-display text-2xl font-black tracking-tight">Pawgress</span>
            </div>
            <div className="eyebrow"><Sparkles size={15} /> A little movement. A big adventure.</div>
            <h1 className="mt-5 max-w-xl font-display text-5xl font-black leading-[1.02] tracking-[-.04em] sm:text-7xl">
              Get better<br /><span className="text-[#ef8c8c]">together.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg font-medium leading-8 text-[#607188]">
              Turn your pet into a playful exercise buddy and cross the ice, one comfortable shoulder movement at a time.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button className="primary-button" onClick={() => setStep('pet')}>Meet your buddy <ArrowRight size={19} /></button>
              <span className="flex items-center gap-2 text-sm font-bold text-[#718499]"><ShieldCheck size={18} className="text-[#68c7c9]" /> Video stays on this device</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-5 text-xs font-bold text-[#7e90a4]">
              <span>✓ No account</span><span>✓ 60-second challenge</span><span>✓ Demo mode included</span>
            </div>
          </section>
          <section className="hero-ice relative mx-auto grid h-[480px] w-full max-w-[500px] place-items-center">
            <div className="absolute inset-12 rounded-full bg-white/50 blur-3xl" />
            <div className="relative pet-float">
              <PetAvatar pet={demoPet} size="lg" />
              <div className="absolute -right-20 top-0 rotate-6 rounded-2xl border border-white bg-white/85 px-4 py-3 text-sm font-black shadow-xl backdrop-blur">Let’s move! ✨</div>
            </div>
            <div className="absolute bottom-8 h-24 w-[80%] rounded-[50%] border-t-8 border-white bg-[#b9ecf7] shadow-[0_15px_0_#74bfd2,0_30px_50px_rgba(66,127,166,.25)]" />
            <div className="absolute bottom-40 left-10 text-4xl snow-drift">❄</div>
            <div className="absolute right-10 top-16 text-3xl snow-drift" style={{ animationDelay: '.8s' }}>✦</div>
          </section>
        </main>
      )}

      {step === 'pet' && (
        <main className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <div className="eyebrow mx-auto"><PawPrint size={15} /> Choose your teammate</div>
            <h1 className="page-title">Who’s joining the adventure?</h1>
            <p className="page-subtitle">Upload a favorite photo or start instantly with Mochi, our bundled demo pet.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            <button className={`pet-card ${pet.kind === 'demo' ? 'pet-card-selected' : ''}`} onClick={() => { setPet(demoPet); setPetName('Mochi'); }}>
              <span className="demo-pill">Bundled demo</span>
              <PetAvatar pet={demoPet} size="lg" />
              <span className="mt-2 font-display text-2xl font-black">Mochi</span>
              <span className="text-sm font-semibold text-[#728499]">Ready to play right away</span>
              {pet.kind === 'demo' && <span className="selected-check"><Check size={16} /></span>}
            </button>
            <label className={`pet-card cursor-pointer ${pet.kind === 'upload' ? 'pet-card-selected' : ''}`}>
              {pet.kind === 'upload' ? <PetAvatar pet={pet} size="lg" /> : <span className="grid h-36 w-36 place-items-center rounded-[2rem] border-2 border-dashed border-[#9dced8] bg-[#effbff]"><ImagePlus size={44} className="text-[#68b8c7]" /></span>}
              <span className="mt-2 font-display text-2xl font-black">{pet.kind === 'upload' ? petName : 'Your own pet'}</span>
              <span className="text-sm font-semibold text-[#728499]">PNG, JPEG or WebP · max 5 MB</span>
              <span className="secondary-button pointer-events-none mt-3"><Upload size={17} /> Choose image</span>
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleUpload(event.target.files?.[0])} />
              {pet.kind === 'upload' && <span className="selected-check"><Check size={16} /></span>}
            </label>
          </div>
          {uploadError && <p className="mx-auto mt-4 max-w-xl rounded-xl bg-[#fff0f0] px-4 py-3 text-center text-sm font-bold text-[#b85d66]">{uploadError}</p>}
          {pet.kind === 'upload' && (
            <div className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-2xl bg-white/65 p-3">
              <label className="text-xs font-black uppercase tracking-wider text-[#8394a7]" htmlFor="pet-name">Name</label>
              <input id="pet-name" value={petName} maxLength={24} onChange={(event) => { setPetName(event.target.value); setPet((current) => ({ ...current, name: event.target.value || 'My Pet' })); }} className="min-w-0 flex-1 rounded-xl border border-[#d8e7ec] bg-white px-3 py-2 font-bold outline-none focus:border-[#68c7c9]" />
            </div>
          )}
          <div className="mt-9 text-center">
            <button className="primary-button" onClick={() => setStep('calibrate')}><Sparkles size={18} /> Hatch My Pet <ChevronRight size={18} /></button>
            <p className="mt-3 text-xs font-semibold text-[#8394a7]">Your image stays in this browser and is never uploaded by Pawgress.</p>
          </div>
        </main>
      )}

      {step === 'calibrate' && (
        <main className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <div className="eyebrow mx-auto"><Camera size={15} /> Quick setup</div>
            <h1 className="page-title">How would you like to play?</h1>
            <p className="page-subtitle">Use your camera for live movement tracking, or take the instant demo route.</p>
          </div>
          <div className="mx-auto mt-9 grid max-w-5xl gap-7 lg:grid-cols-[1.15fr_.85fr]">
            <section className="glass-card overflow-hidden p-3">
              <div className="camera-frame relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-[#24354c]">
                <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" playsInline muted />
                <PoseOverlay landmarks={landmarks} />
                {!cameraEnabled && <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#d7f5fa] to-[#c9e4f6]"><div className="text-center"><Camera className="mx-auto mb-3 text-[#67b4c3]" size={44} /><p className="font-black">Camera is off</p><p className="mt-1 text-sm text-[#6f8296]">Start only when you’re ready</p></div></div>}
                {cameraEnabled && tracker.status !== 'ready' && <div className="absolute inset-x-4 bottom-4 rounded-xl bg-[#26354d]/80 px-4 py-3 text-center text-sm font-bold text-white backdrop-blur">{tracker.status === 'requesting' ? 'Waiting for camera permission…' : tracker.status === 'loading-model' ? 'Loading pose tracker…' : tracker.status === 'error' ? tracker.error : 'Starting…'}</div>}
                {tracker.status === 'ready' && <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-[#2d4b47]/75 px-3 py-1.5 text-xs font-black text-white backdrop-blur"><span className={`h-2 w-2 rounded-full ${metrics.trackingValid ? 'bg-[#8ff0b7]' : 'bg-[#ffd16d]'}`} />{metrics.trackingValid ? 'Pose found' : 'Step into frame'}</div>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#718499]"><ShieldCheck size={16} className="text-[#68c7c9]" /> Processed locally</div>
                {!cameraEnabled ? <button className="secondary-button" onClick={() => { setMode('camera'); setCameraEnabled(true); }}><Camera size={17} /> Start camera</button> : <button className="text-button" onClick={() => setCameraEnabled(false)}>Turn camera off</button>}
              </div>
            </section>
            <section className="space-y-4">
              <div className="glass-card p-5">
                <h2 className="font-display text-xl font-black">Comfort target</h2>
                <p className="mt-1 text-sm leading-6 text-[#708197]">Choose the visual game target you plan to use. Pawgress does not prescribe exercise intensity.</p>
                <div className="mt-5 flex items-center gap-4">
                  <input aria-label="Target arm angle" className="accent-[#68c7c9]" type="range" min="60" max="120" step="5" value={targetAngle} onChange={(event) => setTargetAngle(Number(event.target.value))} />
                  <span className="rounded-xl bg-[#e6f8f7] px-3 py-2 font-black text-[#3b7e83]">{targetAngle}°</span>
                </div>
                <p className="mt-3 flex gap-2 text-xs leading-5 text-[#8192a4]"><Info size={14} className="mt-0.5 shrink-0" /> Stop if movement feels painful or unsafe. Follow guidance from your qualified clinician.</p>
              </div>
              <button className="mode-card group" disabled={tracker.status !== 'ready'} onClick={() => startGame('camera')}>
                <span className="mode-icon bg-[#e3f6f7] text-[#52aeb4]"><Camera /></span><span className="text-left"><strong>Play with camera</strong><small>{tracker.status === 'ready' ? 'Pose tracking is ready' : 'Start the camera first'}</small></span><ChevronRight className="ml-auto transition group-hover:translate-x-1" />
              </button>
              <button className="mode-card group" onClick={() => { setCameraEnabled(false); startGame('demo'); }}>
                <span className="mode-icon bg-[#fff0e9] text-[#ef8c76]"><Dices /></span><span className="text-left"><strong>Use instant demo</strong><small>Three clicks, full judge flow</small></span><ChevronRight className="ml-auto transition group-hover:translate-x-1" />
              </button>
            </section>
          </div>
        </main>
      )}

      {step === 'game' && (
        <main className="mx-auto max-w-6xl px-5 pb-10 pt-3 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#77a3aa]">Ice island challenge</p><h1 className="font-display text-3xl font-black">Reach, lower, hop!</h1></div>
            <div className="flex gap-2">
              <button className={`small-toggle ${ghostMode ? 'small-toggle-on' : ''}`} onClick={() => setGhostMode((value) => !value)}><Ghost size={16} /> Ghost</button>
              <button className="small-toggle" onClick={resetSession}><RotateCcw size={16} /> Reset</button>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.45fr_.75fr]">
            <section>
              <GameScene pet={pet} reps={reps} completed={completed} />
              <div className="mt-4 rounded-2xl border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${feedback?.type === 'TRUNK_DEVIATION' || feedback?.type === 'TRACKING_LOST' ? 'bg-[#fff1e3]' : 'bg-[#e4f8f2]'}`}>{feedback?.type === 'REP_COMPLETED' ? '⭐' : feedback?.type === 'SESSION_COMPLETED' ? '🏝️' : '🐾'}</span>
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#83a0aa]">{feedback?.type.replaceAll('_', ' ') ?? 'COACH'}</p><p className="font-bold text-[#43546c]">{feedback?.message ?? 'Ready when you are.'}</p></div>
                  <div className="hidden items-center gap-1 sm:flex">{[1, 2, 3].map((rep) => <span key={rep} className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${reps >= rep ? 'bg-[#ffd66e] text-[#725415]' : 'bg-[#e5edf1] text-[#97a6b3]'}`}>{reps >= rep ? '★' : rep}</span>)}</div>
                </div>
              </div>
            </section>
            <aside className="space-y-4">
              {mode === 'camera' ? (
                <div className="glass-card p-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-[#25364d]">
                    <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" playsInline muted />
                    {ghostFrame && <PoseOverlay landmarks={ghostFrame.landmarks} ghost />}
                    <PoseOverlay landmarks={landmarks} />
                    <span className="absolute bottom-3 left-3 rounded-full bg-[#27384d]/75 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Live · local</span>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-5 text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e5f7fb] text-4xl">🎮</div>
                  <h2 className="mt-3 font-display text-xl font-black">Demo controls</h2>
                  <p className="mt-1 text-sm leading-6 text-[#718399]">Each click simulates one comfortable raise-and-lower cycle through the real rep logic.</p>
                  <button className="primary-button mt-5 w-full justify-center" disabled={demoBusy || completed} onClick={runDemoRep}><Play size={18} fill="currentColor" />{demoBusy ? 'Moving…' : completed ? 'Challenge complete' : 'Complete a demo rep'}</button>
                  <span className="mt-3 block text-[10px] font-black uppercase tracking-[.14em] text-[#9a7a5b]">Simulated pose data</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
                <MetricRing value={metrics.armAngle} max={180} label="Arm elevation" />
                <MetricRing value={metrics.trunkLean} max={30} label="Trunk lean" tone="coral" />
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#8798aa]"><span>Target</span><span>{targetAngle}°</span></div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#dfecef]"><div className="h-full rounded-full bg-gradient-to-r from-[#68c7c9] to-[#85d9ba] transition-all duration-200" style={{ width: `${Math.min(100, (metrics.armAngle / targetAngle) * 100)}%` }} /></div>
                <p className="mt-3 text-xs leading-5 text-[#8192a4]">Estimated from shoulder, elbow and hip landmarks. Not a medical measurement.</p>
              </div>
            </aside>
          </div>
        </main>
      )}

      {step === 'summary' && summary && (
        <main className="page-shell">
          <section className="mx-auto max-w-4xl text-center">
            <div className="relative mx-auto w-fit"><div className="absolute inset-0 scale-150 rounded-full bg-[#ffe798]/40 blur-2xl" /><PetAvatar pet={pet} size="lg" celebrating /></div>
            <div className="eyebrow mx-auto mt-5"><Trophy size={15} /> Adventure complete</div>
            <h1 className="page-title">You made it to the island!</h1>
            <p className="page-subtitle">Three thoughtful movements, three icy hops, one proud teammate.</p>
          </section>
          <section className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            <SummaryCard icon="⭐" value={summary.reps} label="Repetitions" note="Completed" />
            <SummaryCard icon="↗" value={`${Math.round(summary.peakArmAngle)}°`} label="Peak elevation" note={summary.mode === 'demo' ? 'Simulated data' : 'Estimated from camera'} />
            <SummaryCard icon="◎" value={`${summary.maxTrunkLean.toFixed(1)}°`} label="Trunk movement" note={summary.mode === 'demo' ? 'Simulated data' : 'Max estimated lean'} />
          </section>
          <section className="glass-card mx-auto mt-5 max-w-4xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[.15em] text-[#89a0ad]">Past session comparison</p><p className="mt-1 font-bold">{previousSession ? `Previous: ${Math.round(previousSession.peakArmAngle)}° peak · ${previousSession.durationSeconds}s` : 'Complete another adventure to see a comparison.'}</p></div>
              <span className="rounded-xl bg-[#e6f8f7] px-4 py-2 text-sm font-black text-[#3e8589]">Today · {summary.durationSeconds}s</span>
            </div>
          </section>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button className="primary-button" onClick={() => { setSummary(null); setStep('calibrate'); }}><RotateCcw size={18} /> Play again</button>
            <button className="secondary-button" onClick={() => { clearSessions(); setSessionHistory([]); }}>Clear local history</button>
          </div>
          <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-5 text-[#8293a5]">Pawgress provides playful movement feedback only. It does not diagnose conditions or prescribe exercise. Follow your care plan and stop if movement feels unsafe.</p>
        </main>
      )}
    </div>
  );
}

function SummaryCard({ icon, value, label, note }: { icon: string; value: string | number; label: string; note: string }) {
  return (
    <div className="glass-card p-5 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#eef9fa] text-xl">{icon}</span>
      <p className="mt-3 font-display text-3xl font-black">{value}</p>
      <p className="text-sm font-black text-[#566980]">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#91a0af]">{note}</p>
    </div>
  );
}

export default App;
