import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, QrCode, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { DongBrocadeCard } from '../data/dongBrocadeCards';
import MatrixRevealImage from './MatrixRevealImage';
import { ResultAsset } from '../lib/resultAssets';
import { type LanguageMode, type ResultStatus } from '../lib/resultChannel';

type DongBrocadeResultLivePageProps = {
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
    badge: '结果页',
    generatingBadge: '生成中',
    title: '侗锦图样生成结果',
    subtitle: '这个页面独立负责结果生成与下载。当前仍固定输出 `result/001.png`，后续再补图元组合匹配逻辑。',
    back: '返回选择页',
    save: '保存结果',
    regenerate: '再次生成',
    languageToggle: 'EN',
    previewTitle: '综合图样成品',
    previewCaption: '当前不论选择哪三个图元，都会展示 `001.png`。后续只需要替换映射逻辑即可。',
    sourcesTitle: '本次图元',
    detailsTitle: '当前逻辑',
    waitingTitle: '等待开始生成',
    waitingSubtitle: '请在选择页选满 3 个图元后点击“开始生成”。这个结果页会独立接收并播放生成动画。',
    generatingTitle: '正在编织最终图样',
    generatingSubtitle: '画面按矩阵切片逐行展开，每一行从中心向两侧展开，并叠加轻微纱线扫光，最后无缝停留在完整图片上。',
    generatedLabel: '生成完成',
    qrTitle: '扫码下载',
    qrReady: '扫码后会直接打开当前结果图，手机端可长按保存。',
    qrLocalOnly:
      '当前二维码使用的是 localhost 地址，手机无法访问。请改用局域网 IP 打开站点，或配置 `VITE_PUBLIC_BASE_URL`。',
    qrUnavailable: '二维码生成失败，请先使用下方下载链接。',
    downloadUrlLabel: '下载链接',
    fileLabel: '结果文件',
    missingResult: '没有找到结果图，请确认 `result/001.png` 已存在。',
    generatingSteps: ['图元汇聚', '纹理编织', '成品输出'],
    details: [
      '选择页和结果页现在是两个独立页面。选择页点击“开始生成”后只会同步消息，不会跳转。',
      '结果页保持打开时，可以反复接收新的选择结果并重新播放生成动画。',
      '当前结果资源固定为 `result/001.png`，后续再替换为真实图元组合匹配。',
    ],
    frameLabelIdle: 'RESULT PAGE / STANDBY',
    frameLabelGenerating: 'WEAVING / 001.PNG',
    frameLabelReady: 'RESULT / 001.PNG',
  },
  en: {
    badge: 'Result Page',
    generatingBadge: 'Generating',
    title: 'Dong Brocade Result',
    subtitle: 'This page is dedicated to generation and download. It currently outputs `result/001.png` until real motif matching is added.',
    back: 'Back To Selector',
    save: 'Save Result',
    regenerate: 'Generate Again',
    languageToggle: '中文',
    previewTitle: 'Composite Artwork',
    previewCaption: 'No matter which three motifs are selected, the page currently shows `001.png`.',
    sourcesTitle: 'Current Motifs',
    detailsTitle: 'Current Logic',
    waitingTitle: 'Waiting To Generate',
    waitingSubtitle: 'Choose three motifs on the selector page, then click Start Creating there. This result page stays open and generates independently.',
    generatingTitle: 'Weaving The Final Image',
    generatingSubtitle: 'The image reveals row by row as a matrix, each row expanding from the center outward with a soft thread-like shimmer.',
    generatedLabel: 'Generated',
    qrTitle: 'Scan To Download',
    qrReady: 'Scanning opens the current result image directly so it can be saved on a phone.',
    qrLocalOnly:
      'This QR code points to localhost, which a phone cannot reach. Use a LAN IP or set `VITE_PUBLIC_BASE_URL`.',
    qrUnavailable: 'QR code generation failed. Use the direct download link below.',
    downloadUrlLabel: 'Download URL',
    fileLabel: 'Result File',
    missingResult: 'Result image not found. Make sure `result/001.png` exists.',
    generatingSteps: ['Collect motifs', 'Weave texture', 'Render output'],
    details: [
      'The selector page and result page now stay separate. Starting generation only broadcasts data and does not navigate away.',
      'If the result page stays open, it can receive new selections repeatedly and replay the animation each time.',
      'The active asset is still fixed to `result/001.png` until real motif matching is added later.',
    ],
    frameLabelIdle: 'RESULT PAGE / STANDBY',
    frameLabelGenerating: 'WEAVING / 001.PNG',
    frameLabelReady: 'RESULT / 001.PNG',
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

export default function DongBrocadeResultLivePage({
  cards,
  outputAsset,
  languageMode,
  generationStatus,
  generationKey,
  generatedAt,
  onBack,
  onLanguageChange,
  onRegenerate,
}: DongBrocadeResultLivePageProps) {
  const copy = COPY[languageMode];
  const heroCards = cards.slice(0, 3);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const shareInfo = useMemo(() => {
    const shareOrigin = resolveShareOrigin();

    if (!shareOrigin || !outputAsset) {
      return {
        downloadUrl: null,
        isLocalhost: false,
      };
    }

    const downloadUrl = new URL(outputAsset.imageUrl, shareOrigin).toString();
    const hostname = new URL(shareOrigin).hostname;

    return {
      downloadUrl,
      isLocalhost: LOCAL_HOSTS.has(hostname),
    };
  }, [outputAsset]);

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

  const handleDownload = () => {
    if (!outputAsset) {
      return;
    }

    const link = document.createElement('a');
    link.href = outputAsset.imageUrl;
    link.download = outputAsset.fileName;
    link.rel = 'noreferrer';
    link.click();
  };

  const isIdle = generationStatus === 'idle';
  const isGenerating = generationStatus === 'generating';
  const isReady = generationStatus === 'ready';
  const showImageStage = isGenerating || isReady;
  const frameLabel = isIdle
    ? copy.frameLabelIdle
    : isGenerating
      ? copy.frameLabelGenerating
      : copy.frameLabelReady;

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

        <div className="relative z-10 grid gap-8 px-6 pb-8 pt-8 md:items-start md:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] md:px-8 md:pt-10">
          <section className="flex flex-col">
            <div className="mb-5 inline-flex items-center rounded-full border border-stone-900/10 bg-white/80 px-4 py-2 text-[11px] font-semibold tracking-[0.24em] text-stone-900 backdrop-blur">
              {isGenerating ? copy.generatingBadge : copy.badge}
            </div>

            <div className="w-full max-w-[680px] self-center">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-stone-900/10 bg-[#140f12] shadow-[0_35px_70px_-30px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(0,0,0,0.28))]" />

                {isIdle && (
                  <div className="absolute inset-[6%] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
                    <div className="absolute inset-[10%] rounded-[1.7rem] border border-dashed border-white/15 bg-[radial-gradient(circle_at_top,_rgba(160,114,124,0.12),_transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]" />
                    <div className="absolute inset-x-[12%] bottom-[16%] text-center">
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold tracking-[0.22em] text-white/60">
                        <span className="h-2 w-2 rounded-full bg-amber-200/80" />
                        <span>{languageMode === 'zh' ? '等待选择同步' : 'WAITING FOR SELECTION'}</span>
                      </div>
                      <h2 className="text-3xl font-serif text-white md:text-[2.8rem]">{copy.waitingTitle}</h2>
                      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
                        {copy.waitingSubtitle}
                      </p>
                    </div>
                  </div>
                )}

                {showImageStage && (
                  <div className="absolute inset-[6%] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(154,109,121,0.28),_transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_52%)]" />

                    {isGenerating && (
                      <motion.div
                        className="absolute inset-y-[-10%] left-[-28%] w-[52%] rotate-[8deg] opacity-0"
                        style={{
                          background:
                            'repeating-linear-gradient(90deg, rgba(255,247,228,0) 0px, rgba(255,247,228,0.04) 4px, rgba(255,247,228,0.16) 11px, rgba(255,247,228,0.05) 18px, rgba(255,247,228,0) 24px)',
                          filter: 'blur(10px)',
                          mixBlendMode: 'screen',
                        }}
                        animate={{
                          x: ['0%', '235%'],
                          opacity: [0, 0.34, 0.18, 0],
                        }}
                        transition={{
                          duration: 4.8,
                          repeat: Infinity,
                          ease: [0.2, 0.82, 0.2, 1],
                        }}
                      />
                    )}

                    <div className="absolute inset-x-0 top-8 text-center text-[10px] font-semibold tracking-[0.28em] text-white/60">
                      {frameLabel}
                    </div>

                    <div className="absolute inset-[8%] flex items-center justify-center rounded-[1.7rem] border border-white/8 bg-black/14 p-6 md:p-8">
                      {outputAsset ? (
                      <MatrixRevealImage
                        replayKey={generationKey}
                        src={outputAsset.imageUrl}
                        alt={languageMode === 'zh' ? '侗锦生成动画' : 'Dong brocade generation animation'}
                        className="h-full w-full"
                        tileCount={21}
                        rowDelayMs={210}
                        centerDelayMs={94}
                        animate={isGenerating}
                      />
                      ) : (
                        <div className="max-w-sm text-center text-sm leading-relaxed text-white/70">{copy.missingResult}</div>
                      )}
                    </div>

                    {isGenerating && (
                      <div className="absolute inset-x-[10%] bottom-[7%]">
                        <div className="mb-4 flex items-center justify-center gap-2">
                          {copy.generatingSteps.map((step, index) => (
                            <motion.div
                              key={step}
                              className="h-2.5 w-2.5 rounded-full bg-white/40"
                              animate={{
                                scale: [1, 1.48, 1],
                                opacity: [0.3, 1, 0.3],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: index * 0.24,
                              }}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {copy.generatingSteps.map((step) => (
                            <div
                              key={step}
                              className="rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-center text-[10px] font-semibold tracking-[0.2em] text-white/78 backdrop-blur"
                            >
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-7 pb-8 pt-20 text-white">
                  <div className="mb-3 text-[11px] font-semibold tracking-[0.26em] text-white/70">
                    {isIdle ? copy.frameLabelIdle : heroCards.map((card) => card.code).join(' / ')}
                  </div>
                  <h2 className="text-3xl font-serif leading-[1.02] md:text-[2.7rem]">
                    {isIdle ? copy.waitingTitle : isGenerating ? copy.generatingTitle : copy.previewTitle}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/78">
                    {isIdle ? copy.waitingSubtitle : isGenerating ? copy.generatingSubtitle : copy.previewCaption}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-h-[720px] flex-col justify-between rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)] backdrop-blur">
            <div>
              <h1 className="text-3xl font-serif leading-[1.06] text-stone-900 md:text-[2.5rem]">{copy.title}</h1>
              <p className="mt-4 text-sm leading-relaxed text-stone-600 md:text-base">{copy.subtitle}</p>

              {generatedAt && isReady && (
                <div className="mt-6 inline-flex rounded-full bg-stone-100 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-stone-600">
                  {copy.generatedLabel} {formatGeneratedTime(generatedAt, languageMode)}
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-xs font-semibold tracking-[0.24em] text-stone-500">{copy.sourcesTitle}</h3>
                <div className="mt-4 grid grid-cols-3 gap-3">
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
                        <div key={card.code} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                          <img
                            src={card.frontImage}
                            alt={card.name}
                            className="aspect-[3/4] w-full object-cover"
                            draggable={false}
                          />
                          <div className="border-t border-stone-200 px-2 py-2 text-center">
                            <div className="text-[10px] font-mono tracking-[0.22em] text-stone-700">{card.code}</div>
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-xs font-semibold tracking-[0.24em] text-stone-500">{copy.detailsTitle}</h3>
                <div className="mt-4 space-y-3">
                  {copy.details.map((item) => (
                    <p key={item} className="rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-relaxed text-stone-700">
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              {isReady && outputAsset && (
                <div className="mt-8 rounded-[1.75rem] border border-stone-900/10 bg-stone-100/80 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold tracking-[0.12em] text-stone-900">{copy.qrTitle}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-stone-600">
                        {shareInfo.isLocalhost ? copy.qrLocalOnly : copy.qrReady}
                      </p>
                    </div>
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

                    <div className="min-w-0">
                      <div className="rounded-2xl bg-white/85 px-4 py-3">
                        <div className="text-[11px] font-semibold tracking-[0.2em] text-stone-500">{copy.fileLabel}</div>
                        <div className="mt-2 text-sm font-medium text-stone-900">{outputAsset.fileName}</div>
                      </div>

                      <div className="mt-3 rounded-2xl bg-white/85 px-4 py-3">
                        <div className="text-[11px] font-semibold tracking-[0.2em] text-stone-500">{copy.downloadUrlLabel}</div>
                        <div className="mt-2 break-all text-xs leading-relaxed text-stone-700">
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
                disabled={!isReady || !outputAsset}
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
