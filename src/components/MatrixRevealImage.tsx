import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';

type MatrixRevealImageProps = {
  src: string;
  alt: string;
  className?: string;
  tileCount?: number;
  rowDelayMs?: number;
  centerDelayMs?: number;
  animate?: boolean;
  replayKey?: number;
};

type ImageDimensions = {
  width: number;
  height: number;
};

type Tile = {
  id: string;
  row: number;
  column: number;
  rows: number;
  columns: number;
  delayMs: number;
  offsetX: number;
  offsetY: number;
  centerDistanceRatio: number;
};

const DEFAULT_DIMENSIONS: ImageDimensions = {
  width: 4,
  height: 5,
};

const clampTileCount = (value: number) => Math.max(9, Math.min(27, Math.round(value)));

export default function MatrixRevealImage({
  src,
  alt,
  className,
  tileCount = 21,
  rowDelayMs = 210,
  centerDelayMs = 94,
  animate = true,
  replayKey = 0,
}: MatrixRevealImageProps) {
  const [dimensions, setDimensions] = useState<ImageDimensions>(DEFAULT_DIMENSIONS);
  const safeTileCount = clampTileCount(tileCount);

  useEffect(() => {
    let isDisposed = false;
    const image = new window.Image();

    image.onload = () => {
      if (!isDisposed && image.naturalWidth > 0 && image.naturalHeight > 0) {
        setDimensions({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      }
    };

    image.src = src;

    return () => {
      isDisposed = true;
    };
  }, [src]);

  const aspectRatio = dimensions.width / dimensions.height;

  const tileGrid = useMemo<Tile[]>(() => {
    const columns = safeTileCount;
    const rows = Math.max(10, Math.round(columns / aspectRatio));
    const centerColumn = (columns - 1) / 2;
    const maxCenterDistance = Math.max(centerColumn, 1);

    return Array.from({ length: rows * columns }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const centerDistance = Math.abs(column - centerColumn);
      const side = column >= centerColumn ? 1 : -1;
      const centerDistanceRatio = centerDistance / maxCenterDistance;

      return {
        id: `${row}-${column}`,
        row,
        column,
        rows,
        columns,
        delayMs: row * rowDelayMs + centerDistance * centerDelayMs,
        offsetX: side * (12 + centerDistanceRatio * 26),
        offsetY: 10 + row * 0.8,
        centerDistanceRatio,
      };
    });
  }, [aspectRatio, centerDelayMs, rowDelayMs, safeTileCount]);

  const totalRevealMs =
    tileGrid.reduce((maxDelay, tile) => Math.max(maxDelay, tile.delayMs), 0) + 2200;
  const rowCount = tileGrid[0]?.rows ?? 0;
  const leadInMs = 680;
  const baseRevealDelayMs = Math.max(totalRevealMs - 900, totalRevealMs * 0.82);

  return (
    <div className={`flex h-full w-full items-center justify-center ${className ?? ''}`}>
      <div
        key={replayKey}
        className="relative h-full w-full overflow-hidden rounded-[1.35rem]"
        style={{
          background: '#000000',
        }}
      >
        <motion.div
          className="absolute inset-0"
          initial={
            animate
              ? {
                  opacity: 0,
                  filter: 'blur(10px) brightness(0.95)',
                  scale: 1.005,
                }
              : false
          }
          animate={{
            opacity: 1,
            filter: 'blur(0px) brightness(1)',
            scale: 1,
          }}
          transition={{
            duration: animate ? 1.1 : 0,
            delay: animate ? (leadInMs + baseRevealDelayMs) / 1000 : 0,
            ease: [0.16, 0.84, 0.18, 1],
          }}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("${src}")`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 bg-black"
          initial={animate ? { opacity: 1 } : false}
          animate={{ opacity: animate ? [1, 1, 0.96, 0.7, 0.28, 0] : 0 }}
          transition={{
            duration: animate ? totalRevealMs / 1000 : 0,
            ease: [0.22, 0.78, 0.2, 1],
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 bg-black"
          initial={animate ? { opacity: 1, clipPath: 'inset(0 0 0% 0)' } : false}
          animate={{
            opacity: animate ? [1, 0.92, 0.54, 0.2, 0] : 0,
            clipPath: animate
              ? [
                  'inset(0 0 0% 0)',
                  'inset(0 0 42% 0)',
                  'inset(0 0 74% 0)',
                  'inset(0 0 92% 0)',
                  'inset(0 0 100% 0)',
                ]
              : 'inset(0 0 100% 0)',
          }}
          transition={{
            duration: animate ? totalRevealMs / 1000 : 0,
            ease: [0.16, 0.84, 0.18, 1],
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_58%)]"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: animate ? [0, 0.04, 0.08, 0.03] : 0.03 }}
          transition={{
            duration: animate ? totalRevealMs / 1000 : 0,
            ease: 'linear',
          }}
        />

        <motion.div
          className="pointer-events-none absolute left-[7%] right-[7%] top-0 h-[8%] rounded-full"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,249,239,0.42), rgba(255,249,239,0.18), rgba(255,249,239,0))',
            filter: 'blur(10px)',
          }}
          initial={animate ? { opacity: 0, y: '-100%' } : false}
          animate={{
            opacity: animate ? [0, 0.72, 0.28, 0] : 0,
            y: animate ? ['0%', '1180%'] : '0%',
          }}
          transition={{
            duration: animate ? (totalRevealMs - 380) / 1000 : 0,
            delay: animate ? leadInMs / 1000 : 0,
            ease: [0.16, 0.86, 0.2, 1],
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-y-[-18%] left-[-35%] w-[72%] rotate-[8deg] opacity-0"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.08) 2px, rgba(255,244,220,0.28) 5px, rgba(255,255,255,0.16) 8px, rgba(255,244,220,0.1) 12px, rgba(255,255,255,0) 16px)',
            mixBlendMode: 'screen',
            filter: 'blur(5px)',
          }}
          initial={animate ? { x: '0%', opacity: 0 } : false}
          animate={{
            x: '215%',
            opacity: animate ? [0, 0.7, 0.34, 0] : 0,
          }}
          transition={{
            duration: animate ? totalRevealMs / 1000 : 0,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        />

        <motion.div
          className="pointer-events-none absolute inset-y-[-12%] left-[-22%] w-[34%] rotate-[-5deg] opacity-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,245,228,0), rgba(255,248,235,0.28), rgba(255,255,255,0.42), rgba(255,248,235,0.22), rgba(255,245,228,0))',
            mixBlendMode: 'screen',
            filter: 'blur(16px)',
          }}
          initial={animate ? { x: '0%', opacity: 0 } : false}
          animate={{
            x: '365%',
            opacity: animate ? [0, 0.42, 0.12, 0] : 0,
          }}
          transition={{
            duration: animate ? totalRevealMs / 1000 : 0,
            ease: [0.18, 0.86, 0.2, 1],
          }}
        />

        {Array.from({ length: rowCount }, (_, row) => (
          <motion.div
            key={`row-pulse-${row}`}
            className="pointer-events-none absolute left-[4%] right-[4%] rounded-full"
            style={{
              top: `${(row / Math.max(rowCount, 1)) * 100}%`,
              height: `${100 / Math.max(rowCount, 1)}%`,
              background:
                'linear-gradient(90deg, rgba(255,244,220,0), rgba(255,244,220,0.28), rgba(255,255,255,0.55), rgba(255,244,220,0.28), rgba(255,244,220,0))',
              filter: 'blur(8px)',
            }}
            initial={animate ? { opacity: 0, scaleX: 0.12 } : false}
            animate={{
              opacity: animate ? [0, 0.55, 0.12, 0] : 0,
              scaleX: animate ? [0.14, 1, 1.04] : 1,
            }}
            transition={{
              duration: animate ? 1.05 : 0,
              delay: animate ? (leadInMs + row * rowDelayMs) / 1000 : 0,
              ease: [0.12, 0.92, 0.24, 1],
            }}
          />
        ))}

        {tileGrid.map((tile) => (
          <motion.div
            key={tile.id}
            className="absolute"
            style={{
              left: `${(tile.column / tile.columns) * 100}%`,
              top: `${(tile.row / tile.rows) * 100}%`,
              width: `${100 / tile.columns}%`,
              height: `${100 / tile.rows}%`,
              transformOrigin: 'center center',
            }}
            initial={
              animate
                ? {
                    opacity: 0,
                    scale: 0.06,
                    x: tile.offsetX,
                    y: tile.offsetY,
                    filter: 'blur(15px) brightness(1.42) saturate(1.26)',
                  }
                : false
            }
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              filter: 'blur(0px) brightness(1) saturate(1)',
            }}
            transition={{
              duration: animate ? 1.32 : 0,
              delay: animate ? (leadInMs + tile.delayMs) / 1000 : 0,
              ease: [0.1, 0.94, 0.22, 1],
            }}
          >
            <motion.div
              className="h-full w-full"
              style={{
                backgroundImage: `url("${src}")`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${tile.columns * 100}% ${tile.rows * 100}%`,
                backgroundPositionX: `${tile.columns <= 1 ? 0 : (tile.column / (tile.columns - 1)) * 100}%`,
                backgroundPositionY: `${tile.rows <= 1 ? 0 : (tile.row / (tile.rows - 1)) * 100}%`,
              }}
              animate={{
                boxShadow: animate
                  ? [
                      'inset 0 0 0 rgba(255,245,220,0), 0 0 0 rgba(255,232,176,0), 0 0 0 rgba(255,255,255,0)',
                      'inset 0 0 22px rgba(255,247,231,0.26), 0 0 36px rgba(255,232,176,0.44), 0 0 12px rgba(255,255,255,0.3)',
                      'inset 0 0 4px rgba(255,247,231,0.08), 0 0 0 rgba(255,232,176,0), 0 0 0 rgba(255,255,255,0)',
                    ]
                  : 'inset 0 0 0 rgba(255,245,220,0), 0 0 0 rgba(255,232,176,0), 0 0 0 rgba(255,255,255,0)',
                outlineColor: animate
                  ? [
                      'rgba(255,244,220,0)',
                      `rgba(255,244,220,${0.9 - tile.centerDistanceRatio * 0.35})`,
                      'rgba(255,244,220,0)',
                    ]
                  : 'rgba(255,244,220,0)',
                outlineWidth: animate ? ['0px', '1px', '0px'] : '0px',
                outlineOffset: animate ? ['0px', '-1px', '0px'] : '0px',
              }}
              transition={{
                duration: animate ? 1.34 : 0,
                delay: animate ? (leadInMs + tile.delayMs) / 1000 : 0,
                ease: [0.16, 0.88, 0.2, 1],
              }}
              aria-label={alt}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
