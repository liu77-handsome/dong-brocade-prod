import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, QrCode, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import connotationMap from '../data/connotationMap.json';
import { DongBrocadeCard } from '../data/dongBrocadeCards';
import MatrixRevealImage from './MatrixRevealImage';
import {
  type ResultAsset,
  resolveResultAssetImageUrl,
} from '../lib/resultAssetIndex';
import { type LanguageMode, type ResultStatus } from '../lib/resultChannel';

type ConnotationEntry = {
  code: string;
  name: string;
  attributes: string[];
};

const MOTIF_NAME_TRANSLATIONS: Record<string, string> = {
  凤鸟纹: 'Phoenix-Bird Motif',
  钩藤纹: 'Hooked Vine Motif',
  蜘蛛纹: 'Spider Motif',
  石磨纹: 'Millstone Motif',
  龙纹: 'Dragon Motif',
  鸟纹: 'Bird Motif',
  栀子花纹: 'Gardenia Blossom Motif',
  多耶纹: 'Duoye Motif',
  鱼纹: 'Fish Motif',
  桥梁花纹: 'Bridge Motif',
  星星花纹: 'Star Blossom Motif',
  马纹: 'Horse Motif',
  灯笼花纹: 'Lantern Blossom Motif',
  八角花纹: 'Octagonal Blossom Motif',
  八钩纹: 'Eight-Hook Motif',
  山纹: 'Mountain Motif',
  井纹: 'Well Motif',
  青蛙纹: 'Frog Motif',
  太阳纹: 'Sun Motif',
  竹根花纹: 'Bamboo Root Blossom Motif',
  寿字纹: 'Longevity Character Motif',
  蝴蝶纹: 'Butterfly Motif',
  '游蛇/水波纹': 'Serpentine Wave Motif',
  梨子花纹: 'Pear Blossom Motif',
  耕田纹: 'Plowed Field Motif',
};

const ATTRIBUTE_TRANSLATIONS: Record<string, string> = {
  吉祥: 'Auspiciousness',
  健康: 'Health',
  长寿: 'Longevity',
  浪漫: 'Romance',
  热情: 'Passion',
  繁衍: 'Prosperity',
  和谐: 'Harmony',
  坚韧: 'Resilience',
  智慧: 'Wisdom',
  富足: 'Abundance',
  团结: 'Unity',
  勇敢: 'Courage',
  平安: 'Peace',
  勤奋: 'Diligence',
};

type DongBrocadeResultGalleryProps = {
  cards: DongBrocadeCard[];
  outputAsset: ResultAsset | null;
  languageMode: LanguageMode;
  generationStatus: ResultStatus | 'idle';
  generationKey: number;
  generatedAt: number | null;
  onBack: () => void;
  onLanguageChange: (languageMode: LanguageMode) => void;
  onRegenerate: () => void;
};

const COPY = {
  zh: {
    back: '返回选择页',
    save: '保存结果',
    regenerate: '再次生成',
    languageToggle: 'EN',
    waitingTitle: '等待开始生成',
    waitingSubtitle:
      '请在选择页选满 3 个图元后点击“开始生成”。结果页会独立接收并播放生成动画。',
    generatingSubtitle:
      '画面会从纯黑背景开始，由顶部到底部逐行拼接，最终输出完整纹样。',
    generatedAtPrefix: '生成时间',
    qrReady: '扫码后会直接打开当前结果图，手机端可长按保存。',
    qrLocalOnly:
      '当前二维码使用的是 localhost 地址，手机无法访问。请改用局域网 IP 打开站点，或配置 VITE_PUBLIC_BASE_URL。',
    qrUnavailable: '二维码暂不可用，请先使用下方下载链接。',
    missingResult: '当前没有可用的结果图，请检查纹样打标目录中的最终效果文件。',
    loadingResult: '正在载入匹配到的最终效果图...',
    generatingSteps: ['图元比对', '纹样拼接', '结果输出'],
    emptyConnotation: '当前图元暂无文化属性数据。',
    waitingSelection: '等待选择同步',
  },
  en: {
    back: 'Back To Selector',
    save: 'Save Result',
    regenerate: 'Generate Again',
    languageToggle: '中文',
    waitingTitle: 'Waiting To Generate',
    waitingSubtitle:
      'Choose three motifs on the selector page, then click Start Creating there. This page stays open and generates independently.',
    generatingSubtitle:
      'The stage starts from a pure black background and builds the pattern row by row from top to bottom.',
    generatedAtPrefix: 'Generated',
    qrReady:
      'Scan to open the current result image directly so it can be saved on a phone.',
    qrLocalOnly:
      'This QR code points to localhost, which a phone cannot reach. Use a LAN IP or set VITE_PUBLIC_BASE_URL.',
    qrUnavailable: 'QR code is unavailable for now. Use the download link below.',
    missingResult: 'No final result image is available. Check the tagged pattern folders.',
    loadingResult: 'Loading the matched final artwork...',
    generatingSteps: ['Compare motifs', 'Weave pattern', 'Output result'],
    emptyConnotation:
      'No cultural connotation data is available for the current motifs.',
    waitingSelection: 'WAITING FOR SELECTION',
  },
} as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const formatGeneratedTime = (timestamp: number, languageMode: LanguageMode) =>
  new Intl.DateTimeFormat(languageMode === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(timestamp);

const resolveShareOrigin = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const configuredOrigin = import.meta.env.VITE_PUBLIC_BASE_URL?.trim();
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return window.location.origin;
    }
  }

  return window.location.origin;
};

const localizeMotifName = (name: string, languageMode: LanguageMode) => {
  const normalizedName = name.trim();
  if (languageMode === 'zh') {
    return normalizedName;
  }

  return MOTIF_NAME_TRANSLATIONS[normalizedName] ?? normalizedName;
};

const localizeAttribute = (attribute: string, languageMode: LanguageMode) => {
  const normalizedAttribute = attribute.trim();
  if (languageMode === 'zh') {
    return normalizedAttribute;
  }

  return ATTRIBUTE_TRANSLATIONS[normalizedAttribute] ?? normalizedAttribute;
};

export default function DongBrocadeResultGallery({
  cards,
  outputAsset,
  languageMode,
  generationStatus,
  generationKey,
  generatedAt,
  onBack,
  onLanguageChange,
  onRegenerate,
}: DongBrocadeResultGalleryProps) {
  const copy = COPY[languageMode];
  const heroCards = cards.slice(0, 3);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!outputAsset) {
      setResolvedImageUrl(null);
      return () => {
        isCancelled = true;
      };
    }

    setResolvedImageUrl(null);
    resolveResultAssetImageUrl(outputAsset)
      .then((imageUrl) => {
        if (!isCancelled) {
          setResolvedImageUrl(imageUrl);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setResolvedImageUrl(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [outputAsset]);

  const shareInfo = useMemo(() => {
    const shareOrigin = resolveShareOrigin();

    if (!shareOrigin || !outputAsset) {
      return {
        downloadUrl: null,
        directImageUrl: resolvedImageUrl,
        isLocalhost: false,
      };
    }

    const hostname = new URL(shareOrigin).hostname;
    const downloadUrl = new URL(
      `/#/download?asset=${encodeURIComponent(outputAsset.publicId)}&lang=${languageMode}`,
      shareOrigin,
    ).toString();

    return {
      downloadUrl,
      directImageUrl: resolvedImageUrl,
      isLocalhost: LOCAL_HOSTS.has(hostname),
    };
  }, [languageMode, outputAsset, resolvedImageUrl]);

  useEffect(() => {
    let isCancelled = false;

    if (!shareInfo.downloadUrl || generationStatus !== 'ready') {
      setQrCodeDataUrl(null);
      return () => {
        isCancelled = true;
      };
    }

    QRCode.toDataURL(shareInfo.downloadUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#171717',
        light: '#FFFFFFFF',
      },
    })
      .then((nextDataUrl) => {
        if (!isCancelled) {
          setQrCodeDataUrl(nextDataUrl);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setQrCodeDataUrl(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [generationStatus, shareInfo.downloadUrl]);

  const connotationEntries = useMemo<ConnotationEntry[]>(
    () =>
      heroCards.flatMap((card) => {
        const entry = (connotationMap as Record<string, ConnotationEntry | undefined>)[card.code];

        return entry
          ? [
              {
                ...entry,
                name: localizeMotifName(entry.name, languageMode),
                attributes: entry.attributes.map((attribute) =>
                  localizeAttribute(attribute, languageMode),
                ),
              },
            ]
          : [];
      }),
    [heroCards, languageMode],
  );

  const aggregatedAttributes = useMemo(() => {
    const attributeCounter = new Map<string, number>();

    connotationEntries.forEach((entry) => {
      entry.attributes.forEach((attribute) => {
        attributeCounter.set(attribute, (attributeCounter.get(attribute) ?? 0) + 1);
      });
    });

    return [...attributeCounter.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([attribute, count]) => ({
        attribute,
        count,
      }));
  }, [connotationEntries]);

  const handleDownload = () => {
    if (!resolvedImageUrl || !outputAsset) {
      return;
    }

    const link = document.createElement('a');
    link.href = resolvedImageUrl;
    link.download = outputAsset.fileName;
    link.rel = 'noreferrer';
    link.click();
  };

  const isIdle = generationStatus === 'idle';
  const isGenerating = generationStatus === 'generating';
  const isReady = generationStatus === 'ready';
  const showImageStage = isGenerating || isReady;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-100 p-3 md:p-8 lg:p-10">
      <main className="relative w-full max-w-[1320px] min-h-[840px] overflow-hidden rounded-[3.25rem] border-[10px] border-stone-900 bg-[#f7f3ec] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] md:border-[12px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,137,93,0.18),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.65),_rgba(247,243,236,0.96))]" />

        <div className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-8 md:pt-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-xs font-semibold tracking-[0.18em] text-white shadow-lg transition hover:bg-stone-800"
          >
            <ArrowLeft size={16} />
            {copy.back}
          </button>

          <button
            type="button"
            onClick={() => onLanguageChange(languageMode === 'zh' ? 'en' : 'zh')}
            className="rounded-full border border-stone-900/10 bg-white/95 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-stone-900 shadow-lg transition hover:bg-stone-50"
          >
            {copy.languageToggle}
          </button>
        </div>

        <div className="relative z-10 grid gap-8 px-6 pb-8 pt-8 md:items-start md:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] md:px-8 md:pt-10">
          <section className="flex flex-col">
            <div className="w-full max-w-[680px] self-center">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-stone-900/10 bg-[#140f12] shadow-[0_35px_70px_-30px_rgba(0,0,0,0.45)]">
                {isIdle && (
                  <div className="absolute inset-[6%] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
                    <div className="absolute inset-[10%] rounded-[1.7rem] border border-dashed border-white/15 bg-[radial-gradient(circle_at_top,_rgba(160,114,124,0.12),_transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]" />
                    <div className="absolute inset-x-[12%] bottom-[16%] text-center">
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold tracking-[0.22em] text-white/60">
                        <span className="h-2 w-2 rounded-full bg-amber-200/80" />
                        <span>{copy.waitingSelection}</span>
                      </div>
                      <h2 className="text-3xl font-serif text-white md:text-[2.8rem]">
                        {copy.waitingTitle}
                      </h2>
                      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
                        {copy.waitingSubtitle}
                      </p>
                    </div>
                  </div>
                )}

                {showImageStage && (
                  <div className="absolute inset-[6%] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(154,109,121,0.28),_transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))]">
                    <div className="absolute inset-[4%] flex items-center justify-center overflow-hidden rounded-[1.7rem] border border-white/8 bg-black/14 p-0">
                      {resolvedImageUrl ? (
                        <MatrixRevealImage
                          replayKey={generationKey}
                          src={resolvedImageUrl}
                          alt={
                            languageMode === 'zh'
                              ? '侗锦纹样生成动画'
                              : 'Dong brocade pattern generation animation'
                          }
                          className="h-full w-full"
                          tileCount={21}
                          rowDelayMs={210}
                          centerDelayMs={94}
                          animate={isGenerating}
                        />
                      ) : (
                        <div className="max-w-sm text-center text-sm leading-relaxed text-white/70">
                          {outputAsset ? copy.loadingResult : copy.missingResult}
                        </div>
                      )}
                    </div>

                    {isGenerating && (
                      <div className="pointer-events-none absolute inset-x-[14%] bottom-[6%] flex items-center justify-center gap-3">
                        {[0, 1, 2].map((index) => (
                          <motion.div
                            key={index}
                            className="h-2.5 w-10 rounded-full bg-white/20 shadow-[0_0_24px_rgba(255,245,220,0.18)]"
                            animate={{
                              opacity: [0.16, 0.82, 0.16],
                              scaleX: [0.72, 1, 0.72],
                            }}
                            transition={{
                              duration: 1.8,
                              repeat: Infinity,
                              delay: index * 0.18,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="flex min-h-[720px] flex-col justify-between rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)] backdrop-blur">
            <div>
              {generatedAt && isReady && (
                <div className="inline-flex rounded-full bg-stone-100 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-stone-600">
                  {copy.generatedAtPrefix} {formatGeneratedTime(generatedAt, languageMode)}
                </div>
              )}

              <div className="mt-8 grid grid-cols-3 gap-3">
                {heroCards.length === 0
                  ? [0, 1, 2].map((slot) => (
                      <div
                        key={slot}
                        className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-[10px] font-mono tracking-[0.22em] text-stone-400"
                      >
                        0{slot + 1}
                      </div>
                    ))
                  : heroCards.map((card) => (
                      <div
                        key={card.code}
                        className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
                      >
                        <img
                          src={card.frontImage}
                          alt={card.name}
                          className="aspect-[3/4] w-full object-cover"
                          draggable={false}
                        />
                        <div className="border-t border-stone-200 px-2 py-2 text-center">
                          <div className="text-[10px] font-mono tracking-[0.22em] text-stone-700">
                            {card.code}
                          </div>
                        </div>
                      </div>
                    ))}
              </div>

              <div className="mt-8">
                {aggregatedAttributes.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {aggregatedAttributes.map(({ attribute, count }) => (
                        <div
                          key={attribute}
                          className="rounded-full bg-stone-900 px-3 py-2 text-[11px] font-semibold tracking-[0.16em] text-white"
                        >
                          {attribute} x {count}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      {connotationEntries.map((entry) => (
                        <div key={entry.code} className="rounded-2xl bg-stone-100 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-stone-900">
                              {entry.name}
                            </div>
                            <div className="text-[11px] font-mono tracking-[0.18em] text-stone-500">
                              {entry.code}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.attributes.map((attribute) => (
                              <span
                                key={`${entry.code}-${attribute}`}
                                className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700"
                              >
                                {attribute}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-relaxed text-stone-700">
                    {copy.emptyConnotation}
                  </p>
                )}
              </div>

              {isReady && outputAsset && (
                <div className="mt-8 rounded-[1.75rem] border border-stone-900/10 bg-stone-100/80 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-stone-600">
                      {shareInfo.isLocalhost ? copy.qrLocalOnly : copy.qrReady}
                    </p>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-900 shadow-sm">
                      <QrCode size={18} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[148px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[1.5rem] border border-stone-900/10 bg-white p-3 shadow-sm">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt={languageMode === 'zh' ? '结果图下载二维码' : 'Result download QR code'}
                          className="h-full w-full rounded-xl object-contain"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex aspect-square items-center justify-center rounded-xl bg-stone-100 text-center text-xs leading-relaxed text-stone-500">
                          {copy.qrUnavailable}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="rounded-2xl bg-white/85 px-4 py-3">
                        <div className="text-sm font-medium text-stone-900">
                          {outputAsset.fileName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/85 px-4 py-3">
                        <div className="break-all text-xs leading-relaxed text-stone-700">
                          {shareInfo.downloadUrl ?? '--'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRegenerate}
                disabled={heroCards.length === 0}
                className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white px-6 py-3 text-xs font-semibold tracking-[0.18em] text-stone-900 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              >
                <RefreshCw size={16} />
                {copy.regenerate}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!isReady || !outputAsset || !resolvedImageUrl}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-xs font-semibold tracking-[0.18em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                <Download size={16} />
                {copy.save}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
