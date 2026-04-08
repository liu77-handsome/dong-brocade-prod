import { useState, useEffect, useRef, PointerEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { DONG_BROCADE_CARDS, DongBrocadeCard } from '../data/dongBrocadeCards';
import { type LanguageMode } from '../lib/resultChannel';

const CARDS = DONG_BROCADE_CARDS;
const MAX_CONFIRMED_CARDS = 3;
const normalizeRotation = (value: number) => ((value % 360) + 360) % 360;

const COPY = {
  zh: {
    title: ['织出你的侗锦灵感', '挑选纹样，生成专属侗锦图案'],
    subtitle: '从 50 张侗锦纹样卡中挑选 3 张你喜欢的图样，组合生成属于你的侗锦设计。',
    cta: '开始生成',
    languageToggle: 'EN',
    slotLabel: '已选纹样',
    tapToFlip: '点击翻面',
    confirm: '确认加入',
    added: '已加入',
    full: '已选满',
  },
  en: {
    title: ['Weave Your Dong Brocade Story', 'Choose motifs and compose your own pattern'],
    subtitle: 'Pick three motifs from 50 authentic Dong brocade cards to create your own Dong brocade composition.',
    cta: 'Start Creating',
    languageToggle: '中文',
    slotLabel: 'Selected',
    tapToFlip: 'Tap To Flip',
    confirm: 'Confirm',
    added: 'Added',
    full: 'Full',
  },
} as const;

type SelectedCardOrigin = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  targetWidth: number;
  targetHeight: number;
};

const getExpandedCardSize = () =>
  typeof window !== 'undefined' && window.innerWidth >= 768
    ? { width: 320, height: 480 }
    : { width: 240, height: 360 };

const normalizeDegrees = (value: number) => ((value % 360) + 540) % 360 - 180;

type DongBrocadeHeroProps = {
  languageMode?: LanguageMode;
  onLanguageChange?: (languageMode: LanguageMode) => void;
  onStart?: (cardCodes: string[], languageMode: LanguageMode) => void;
};

export default function DongBrocadeHero({
  languageMode: controlledLanguageMode,
  onLanguageChange,
  onStart,
}: DongBrocadeHeroProps) {
  const [selectedCard, setSelectedCard] = useState<DongBrocadeCard | null>(null);
  const [selectedCardOrigin, setSelectedCardOrigin] = useState<SelectedCardOrigin | null>(null);
  const [internalLanguageMode, setInternalLanguageMode] = useState<keyof typeof COPY>('zh');
  const [isFlipped, setIsFlipped] = useState(true);
  const [confirmedCards, setConfirmedCards] = useState<DongBrocadeCard[]>([]);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [resumeRotationOnExit, setResumeRotationOnExit] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [radius, setRadius] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef(0);
  const rotationRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const isSelectedCardConfirmed = selectedCard
    ? confirmedCards.some((card) => card.code === selectedCard.code)
    : false;
  const languageMode = controlledLanguageMode ?? internalLanguageMode;
  const copy = COPY[languageMode];

  const setLanguageMode = (nextLanguageMode: keyof typeof COPY) => {
    if (controlledLanguageMode === undefined) {
      setInternalLanguageMode(nextLanguageMode);
    }
    onLanguageChange?.(nextLanguageMode);
  };

  const handleConfirm = (e: PointerEvent | MouseEvent) => {
    e.stopPropagation();
    if (
      selectedCard &&
      confirmedCards.length < MAX_CONFIRMED_CARDS &&
      !confirmedCards.some((card) => card.code === selectedCard.code)
    ) {
      setConfirmedCards([...confirmedCards, selectedCard]);
      setSelectedCard(null);
      setResumeRotationOnExit(true);
    }
  };

  const handleClose = (e: PointerEvent | MouseEvent) => {
    e.stopPropagation();
    setSelectedCard(null);
    setResumeRotationOnExit(true);
  };

  const handleRemoveCard = (indexToRemove: number) => {
    setConfirmedCards((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (selectedCard) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.9;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastAngle.current = angle;
    setIsDragging(true);
    setRotationPaused(true);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !containerRef.current || selectedCard) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.9;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deltaAngle = (angle - lastAngle.current) * (180 / Math.PI);
    
    const nextRotation = normalizeRotation(rotationRef.current + deltaAngle);
    rotationRef.current = nextRotation;
    setRotationDeg(nextRotation);
    lastAngle.current = angle;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (!selectedCard) {
      setRotationPaused(false);
    }
  };

  const captureCardOrigin = (cardElement: HTMLDivElement, screenRotation: number) => {
    const rect = cardElement.getBoundingClientRect();
    const innerCard = cardElement.firstElementChild as HTMLElement | null;
    const { width: targetWidth, height: targetHeight } = getExpandedCardSize();
    const sourceWidth = innerCard?.offsetWidth ?? rect.width;
    const sourceHeight = innerCard?.offsetHeight ?? rect.height;

    setSelectedCardOrigin({
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
      scaleX: sourceWidth / targetWidth,
      scaleY: sourceHeight / targetHeight,
      rotate: normalizeDegrees(screenRotation),
      targetWidth,
      targetHeight,
    });
  };

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const nextRadius = Math.min(clientWidth * 0.53, clientHeight * 0.86);
      setRadius(nextRadius);
    };

    const observer = new ResizeObserver(updateLayout);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    updateLayout();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rotationPaused && !isDragging) {
      const rotationPerMs = 360 / 240000;

      const tick = (timestamp: number) => {
        if (lastFrameTimeRef.current === null) {
          lastFrameTimeRef.current = timestamp;
        }

        const delta = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;

        const nextRotation = normalizeRotation(rotationRef.current + delta * rotationPerMs);
        rotationRef.current = nextRotation;
        setRotationDeg(nextRotation);
        frameRef.current = window.requestAnimationFrame(tick);
      };

      frameRef.current = window.requestAnimationFrame(tick);
      return () => {
        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = null;
        lastFrameTimeRef.current = null;
      };
    }
  }, [rotationPaused, isDragging]);

  return (
    <div className="min-h-screen w-full bg-stone-100 flex items-center justify-center p-3 md:p-8 lg:p-10 font-sans select-none">
      {/* iPad Pro 11 Device Frame - Landscape */}
      <div className="relative w-full max-w-[1320px] aspect-[1280/880] bg-white overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] rounded-[3.25rem] border-[10px] md:border-[12px] border-stone-900 flex flex-col items-center justify-center">
        <div className="absolute top-8 right-8 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => setLanguageMode(languageMode === 'zh' ? 'en' : 'zh')}
            className="rounded-full border border-stone-900/10 bg-white/95 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-stone-900 shadow-lg transition hover:bg-stone-50"
          >
            {copy.languageToggle}
          </button>
        </div>
        <div 
          ref={containerRef} 
          className="absolute inset-0 overflow-hidden touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Central Content (Inside the arc) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
            <div className="text-center max-w-3xl px-8 mt-[3vh] md:mt-[5vh]">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-[3.35rem] font-serif text-stone-900 mb-5 tracking-tight leading-[1.06]"
              >
                {copy.title[0]}<br />
                <span className="text-[0.7em] text-stone-800">{copy.title[1]}</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm md:text-base text-stone-600 mb-10 max-w-2xl mx-auto leading-relaxed"
              >
                {copy.subtitle}
              </motion.p>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: confirmedCards.length === MAX_CONFIRMED_CARDS ? 1.05 : 1 }}
                whileTap={{ scale: confirmedCards.length === MAX_CONFIRMED_CARDS ? 0.95 : 1 }}
                onClick={() => {
                  if (confirmedCards.length === MAX_CONFIRMED_CARDS) {
                    onStart?.(confirmedCards.map((card) => card.code), languageMode);
                  }
                }}
                disabled={confirmedCards.length !== MAX_CONFIRMED_CARDS}
                className={`px-10 py-4 rounded-full font-bold text-xs tracking-[0.22em] shadow-xl transition-colors pointer-events-auto ${
                  confirmedCards.length === MAX_CONFIRMED_CARDS
                    ? 'bg-black text-white hover:bg-stone-800'
                    : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                }`}
              >
                {copy.cta}
              </motion.button>
              <p className="mt-4 text-[11px] tracking-[0.16em] text-stone-500">
                {confirmedCards.length === MAX_CONFIRMED_CARDS
                  ? languageMode === 'zh'
                    ? '已选 3 张，点击后同步到结果页'
                    : '3 motifs selected, click to sync the result page'
                  : languageMode === 'zh'
                    ? '请选择 3 张纹样卡'
                    : 'Choose 3 motif cards'}
              </p>
            </div>
          </div>

          {/* Card Ring Container - Moved down to accommodate larger radius */}
          <motion.div
            className="absolute left-1/2 top-[90%] flex items-center justify-center z-10 pointer-events-none"
            style={{ rotate: rotationDeg }}
          >
            <div className="relative">
              {CARDS.map((card, index) => {
                const angle = (index / CARDS.length) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const cardRotation = (angle * 180) / Math.PI + 90;

                return (
                  <motion.div
                    key={card.id}
                    className="absolute cursor-pointer pointer-events-auto"
                    style={{
                      left: x,
                      top: y,
                      x: "-50%",
                      y: "-50%",
                      rotate: cardRotation,
                    }}
                    whileHover={{ scale: 1.1, zIndex: 50 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      captureCardOrigin(e.currentTarget as HTMLDivElement, cardRotation + rotationDeg);
                      setSelectedCard(card);
                      setIsFlipped(true); // Reset to back side when opening
                      setRotationPaused(true);
                    }}
                  >
                    <div className="relative w-[clamp(62px,6.2vw,86px)] h-[clamp(94px,9.2vw,130px)] rounded-lg shadow-2xl border border-white/30 overflow-hidden bg-stone-900">
                      <img
                        src={card.frontImage}
                        alt={`${card.name} front`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 py-2 md:px-2">
                        <div className="text-[7px] md:text-[8px] text-white/90 font-mono tracking-[0.2em] text-center">
                          {card.code}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom Placeholders (Foreground) */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 md:gap-8 z-20 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-[96px] h-[64px] md:w-[164px] md:h-[108px] relative rounded-2xl border border-stone-200 bg-white/75 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-lg pointer-events-auto">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-stone-900/50" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-stone-900/50" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-stone-900/50" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-stone-900/50" />
              
              {confirmedCards[i] && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full group relative cursor-pointer"
                  onClick={() => handleRemoveCard(i)}
                  title={languageMode === 'zh' ? '点击移除' : 'Click to remove'}
                >
                  <img
                    src={confirmedCards[i].landscapeImage}
                    alt={`${confirmedCards[i].name} landscape`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <X className="text-white w-6 h-6 md:w-8 md:h-8" />
                  </div>
                </motion.div>
              )}

              {!confirmedCards[i] && (
                <div className="flex flex-col items-center gap-1 text-stone-500">
                  <div className="text-[10px] md:text-xs font-mono tracking-[0.3em]">0{i + 1}</div>
                  <div className="text-[8px] md:text-[9px] tracking-[0.16em]">{copy.slotLabel}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Device Notch/Camera Placeholder */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-stone-800 opacity-20" />
      </div>

      {/* Magnified View Overlay */}
      <AnimatePresence
        onExitComplete={() => {
          if (resumeRotationOnExit && !isDragging) {
            setRotationPaused(false);
          }
          setResumeRotationOnExit(false);
          setSelectedCardOrigin(null);
        }}
      >
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-lg"
          >
            <motion.div 
              className="relative cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
              initial={
                selectedCardOrigin
                  ? {
                      x: selectedCardOrigin.x,
                      y: selectedCardOrigin.y,
                      scaleX: selectedCardOrigin.scaleX,
                      scaleY: selectedCardOrigin.scaleY,
                      rotate: selectedCardOrigin.rotate,
                    }
                  : false
              }
              animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 }}
              exit={
                selectedCardOrigin
                  ? {
                      x: selectedCardOrigin.x,
                      y: selectedCardOrigin.y,
                      scaleX: selectedCardOrigin.scaleX,
                      scaleY: selectedCardOrigin.scaleY,
                      rotate: selectedCardOrigin.rotate,
                    }
                  : undefined
              }
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
              style={{ 
                  width: selectedCardOrigin?.targetWidth ?? getExpandedCardSize().width,
                  height: selectedCardOrigin?.targetHeight ?? getExpandedCardSize().height,
                  perspective: "1500px",
                  transformOrigin: "center center",
              }}
            >
              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleClose}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl z-[110] text-stone-900 hover:bg-stone-100 transition-colors"
              >
                <X size={24} />
              </motion.button>

              {/* 2. 这个层级负责 3D 翻转动画 */}
              <motion.div
                initial={{ rotateY: 0 }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 120, 
                  damping: 20,
                  delay: 0.1 
                }}
                className="w-full h-full relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front Side */}
                <div 
                  className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-stone-950"
                  style={{ 
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden" 
                  }}
                >
                  <img
                    src={selectedCard.frontImage}
                    alt={`${selectedCard.name} front`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-x-0 top-0 flex justify-between items-center px-5 py-4 bg-gradient-to-b from-black/70 to-transparent">
                    <span className="text-[10px] md:text-xs text-white/80 font-mono tracking-[0.25em]">
                      {selectedCard.group}
                    </span>
                    <span className="text-[10px] md:text-xs text-white/95 font-mono tracking-[0.25em]">
                      {selectedCard.code}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 px-5 py-5 bg-gradient-to-t from-black/85 via-black/35 to-transparent">
                    <p className="text-white/90 text-xs md:text-sm font-medium tracking-[0.25em]">
                      {selectedCard.name}
                    </p>
                  </div>
                </div>

                {/* Back Side */}
                <div 
                  className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-stone-950"
                  style={{ 
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)" 
                  }}
                >
                  <img
                    src={selectedCard.backImage}
                    alt={`${selectedCard.name} back`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 bg-gradient-to-t from-black/90 via-black/55 to-transparent flex flex-col items-center gap-4">
                    <div className="text-white/90 font-mono text-[10px] md:text-xs tracking-[0.3em]">
                      {copy.tapToFlip}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleConfirm}
                      disabled={confirmedCards.length >= MAX_CONFIRMED_CARDS || isSelectedCardConfirmed}
                      className={`px-8 py-3 rounded-full font-bold text-xs tracking-widest uppercase shadow-xl transition-all ${
                        confirmedCards.length >= MAX_CONFIRMED_CARDS || isSelectedCardConfirmed
                          ? 'bg-stone-800/95 text-stone-400 cursor-not-allowed'
                          : 'bg-white text-stone-950 hover:bg-stone-100'
                      }`}
                    >
                      {isSelectedCardConfirmed ? copy.added : confirmedCards.length >= MAX_CONFIRMED_CARDS ? copy.full : copy.confirm}
                    </motion.button>

                    <div className="flex gap-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= confirmedCards.length ? 'bg-white' : 'bg-white/35'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
