import { useState, useEffect, useRef, PointerEvent, MouseEvent } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { X } from 'lucide-react';
import { DONG_BROCADE_CARDS, DongBrocadeCard } from '../data/dongBrocadeCards';

const CARDS = DONG_BROCADE_CARDS;
const MAX_CONFIRMED_CARDS = 3;

export default function DongBrocadeHero() {
  const [selectedCard, setSelectedCard] = useState<DongBrocadeCard | null>(null);
  const [isFlipped, setIsFlipped] = useState(true);
  const [confirmedCards, setConfirmedCards] = useState<DongBrocadeCard[]>([]);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [radius, setRadius] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const rotation = useMotionValue(0);
  const lastAngle = useRef(0);
  const isSelectedCardConfirmed = selectedCard
    ? confirmedCards.some((card) => card.code === selectedCard.code)
    : false;

  const handleConfirm = (e: PointerEvent | MouseEvent) => {
    e.stopPropagation();
    if (
      selectedCard &&
      confirmedCards.length < MAX_CONFIRMED_CARDS &&
      !confirmedCards.some((card) => card.code === selectedCard.code)
    ) {
      setConfirmedCards([...confirmedCards, selectedCard]);
      setSelectedCard(null);
      setRotationPaused(false);
    }
  };

  const handleClose = (e: PointerEvent | MouseEvent) => {
    e.stopPropagation();
    setSelectedCard(null);
    setRotationPaused(false);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (selectedCard) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.75;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    lastAngle.current = angle;
    setIsDragging(true);
    setRotationPaused(true);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !containerRef.current || selectedCard) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.75;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const deltaAngle = (angle - lastAngle.current) * (180 / Math.PI);
    
    rotation.set(rotation.get() + deltaAngle);
    lastAngle.current = angle;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (!selectedCard) {
      setRotationPaused(false);
    }
  };

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const minDim = Math.min(clientWidth, clientHeight);
      setRadius(minDim * 0.74);
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
      const controls = animate(rotation, rotation.get() + 360, {
        duration: 240,
        repeat: Infinity,
        ease: "linear",
      });
      return () => controls.stop();
    }
  }, [rotationPaused, isDragging, rotation]);

  return (
    <div className="min-h-screen w-full bg-stone-100 flex items-center justify-center p-4 md:p-12 font-sans select-none">
      {/* iPad Pro 11 Device Frame - Landscape */}
      <div className="relative w-full max-w-[1194px] aspect-[1194/834] bg-white overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] rounded-[3rem] border-[12px] border-stone-900 flex flex-col items-center justify-center">
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
            <div className="text-center max-w-2xl px-8 mt-[-12vh]">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-serif text-stone-900 mb-6 tracking-tight leading-tight"
              >
                Create Stunning Dong Brocade<br />Photos Instantly
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm md:text-base text-stone-600 mb-10 max-w-lg mx-auto"
              >
                Pick three motifs from 50 authentic Dong brocade cards to generate your unique Dong brocade design.
              </motion.p>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-black text-white px-10 py-4 rounded-full font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-stone-800 transition-colors pointer-events-auto"
              >
                START GENERATING NOW
              </motion.button>
            </div>
          </div>

          {/* Card Ring Container - Moved down to accommodate larger radius */}
          <motion.div
            className="absolute left-1/2 top-[75%] flex items-center justify-center z-10 pointer-events-none"
            style={{ rotate: rotation }}
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
                    layoutId={`card-${card.id}`}
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
                      setSelectedCard(card);
                      setIsFlipped(true); // Reset to back side when opening
                      setRotationPaused(true);
                    }}
                  >
                    <div className="relative w-[56px] h-[84px] md:w-[70px] md:h-[106px] rounded-lg shadow-2xl border border-white/30 overflow-hidden bg-stone-900">
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
            <div key={i} className="w-[96px] h-[64px] md:w-[164px] md:h-[108px] relative rounded-2xl border border-stone-200 bg-white/75 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-lg">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-stone-900/50" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-stone-900/50" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-stone-900/50" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-stone-900/50" />
              
              {confirmedCards[i] && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full"
                >
                  <img
                    src={confirmedCards[i].landscapeImage}
                    alt={`${confirmedCards[i].name} landscape`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </motion.div>
              )}

              {!confirmedCards[i] && (
                <div className="text-stone-500 text-[10px] md:text-xs font-mono tracking-[0.3em]">
                  0{i + 1}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Device Notch/Camera Placeholder */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-stone-800 opacity-20" />
      </div>

      {/* Magnified View Overlay */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-lg"
          >
            {/* 1. 这个层级负责 layout 飞行动画 (位置和大小) */}
            <motion.div 
              layoutId={`card-${selectedCard.id}`}
              className="relative w-[240px] h-[360px] md:w-[320px] md:h-[480px] cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ 
                  perspective: "1500px",
                  // 强制覆盖 layout 带来的原有 rotateZ，确保它是正的
                  rotate: 0 
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
                      TAP TO FLIP
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
                      {isSelectedCardConfirmed ? 'ADDED' : confirmedCards.length >= MAX_CONFIRMED_CARDS ? 'FULL' : 'CONFIRM'}
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

