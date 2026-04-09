import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { DongBrocadeCard } from '../data/dongBrocadeCards';
import MatrixRevealImage from './MatrixRevealImage';
import { ResultAsset } from '../lib/resultAssets';
import { type LanguageMode, type ResultStatus } from '../lib/resultChannel';

type DongBrocadeResultExperienceProps = {
  cards: DongBrocadeCard[];
  outputAsset: ResultAsset | null;
  languageMode: LanguageMode;
  generationStatus: ResultStatus | 'idle';
  generatedAt: number | null;
  onBack: () => void;
  onLanguageChange: (languageMode: LanguageMode) => void;
};

const COPY = {
  zh: {
    badge: '结果预览',
    generatingBadge: '生成中',
    title: '侗锦图案生成结果',
    subtitle: '当前阶段固定输出 `result/001.png`。后续只需要补上图样组合映射，就能切换到真正的逻辑匹配。',
    back: '返回选卡',
    save: '保存结果',
    languageToggle: 'EN',
    previewTitle: '综合图样成品',
    previewCaption: '当前无论选择哪组三张纹样，都会统一生成并展示 `001.png`。',
    sourcesTitle: '已选纹样',
    detailsTitle: '当前逻辑',
    waitingTitle: '等待开始生成',
    waitingSubtitle: '请先在首页选满 3 张图样卡，再点击“开始生成”。',
    generatingTitle: '图样正在编织合成',
    generatingSubtitle: '结果图会按矩阵切片，从每一行的中心向两侧展开，并从顶部逐行流畅拼接成 `001.png`。',
    generatedLabel: '生成完成',
    qrTitle: '手机扫码下载',
    qrReady: '扫码后会直接打开当前结果图，手机端可长按或保存。',
    qrLocalOnly:
      '当前二维码使用的是 localhost 地址，手机无法直接访问。请改用局域网 IP 打开站点，或配置 VITE_PUBLIC_BASE_URL。',
    qrUnavailable: '二维码生成失败，请先使用下方下载链接。',
    downloadUrlLabel: '下载链接',
    fileLabel: '结果文件',
    missingResult: '没有找到结果图，请确认 `result/001.png` 已存在。',
    generatingSteps: ['采集纹样', '混合结构', '输出成图'],
    details: [
      '点击生成后会先进入结果页播放生成动画，再切换到最终图片展示。',
      '当前结果资源固定使用 `result/001.png`，不会根据卡片组合变化。',
      '图片展示完成后会生成二维码，便于手机扫码打开并保存图片。',
    ],
  },
  en: {
    badge: 'Result Preview',
    generatingBadge: 'Generating',
    title: 'Dong Brocade Result',
    subtitle: 'This phase always outputs `result/001.png`. Later we can wire real motif-combination matching on top.',
    back: 'Back',
    save: 'Save Result',
    languageToggle: '中文',
    previewTitle: 'Composite Artwork',
    previewCaption: 'No matter which three motifs are selected, the app currently generates and shows `001.png`.',
    sourcesTitle: 'Selected Motifs',
    detailsTitle: 'Current Logic',
    waitingTitle: 'Waiting To Generate',
    waitingSubtitle: 'Select three motif cards on the home page and then start generating.',
    generatingTitle: 'Weaving The Final Composition',
    generatingSubtitle: 'The result image is revealed as matrix tiles, row by row from top to bottom, with each row expanding from the center outward.',
    generatedLabel: 'Generated',
    qrTitle: 'Scan To Download',
    qrReady: 'Scanning opens the current result image directly so it can be saved on a phone.',
    qrLocalOnly:
      'This QR code points to localhost, which a phone cannot reach. Use a LAN IP or set VITE_PUBLIC_BASE_URL.',
    qrUnavailable: 'QR code generation failed. Use the direct download link below.',
    downloadUrlLabel: 'Download URL',
    fileLabel: 'Result File',
    missingResult: 'Result image not found. Make sure `result/001.png` exists.',
    generatingSteps: ['Collecting motifs', 'Weaving structure', 'Rendering output'],
    details: [
      'After Start Creating, the app enters the result page and plays a generation animation before revealing the final image.',
      'The active result resource is currently fixed to `result/001.png`, independent of selected cards.',
      'Once the image is shown, a QR code is generated so a phone can open and save the image.',
    ],
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

export default function DongBrocadeResultExperience({
  cards,
  outputAsset,
  languageMode,
  generationStatus,
  generatedAt,
  onBack,
  onLanguageChange,
}: DongBrocadeResultExperienceProps) {
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

  return (
    <div className="min-h-screen w-full bg-stone-100 flex items-center justify-center p-3 md:p-8 lg:p-10">
      <main className="relative w-full max-w-[1320px] min-h-[840px] overflow-hidden rounded-[3.25rem] border-[10px] md:border-[12px] border-stone-900 bg-[#f7f3ec] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)]">
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

        <div className="relative z-10 grid gap-8 px-6 pb-8 pt-8 md:grid-cols-2 md:px-8 md:pt-10">
          <section className="relative">
            <div className="mb-5 inline-flex items-center rounded-full border border-stone-900/10 bg-white/80 px-4 py-2 text-[11px] font-semibold tracking-[0.24em] text-stone-900 backdrop-blur">
              {isGenerating ? copy.generatingBadge : copy.badge}
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-stone-900/10 bg-[#140f12] shadow-[0_35px_70px_-30px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(0,0,0,0.24))]" />

              {isIdle && (
                <div className="absolute inset-[8%] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
                  <div className="absolute inset-[10%] rounded-[1.6rem] border border-dashed border-white/18 bg-[radial-gradient(circle_at_top,_rgba(160,114,124,0.12),_transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]" />
                  <div className="absolute inset-x-[16%] bottom-[18%] flex flex-col items-center text-center">
                    <div className="mb-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold tracking-[0.22em] text-white/60">
                      <span className="h-2 w-2 rounded-full bg-amber-200/80" />
                      <span>{languageMode === 'zh' ? '等待选择完成' : 'WAITING FOR SELECTION'}</span>
                    </div>
                    <h2 className="text-3xl font-serif text-white md:text-[2.8rem]">{copy.waitingTitle}</h2>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70">{copy.waitingSubtitle}</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-[7%] overflow-hidden rounded-[1.85rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(154,109,121,0.28),_transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))]">
                  <motion.div
                    className="absolute inset-x-[18%] top-0 h-24 bg-gradient-to-b from-amber-200/35 to-transparent blur-xl"
                    animate={{ y: ['-12%', '78%', '-12%'] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_50%)]" />
                  <div className="absolute inset-x-0 top-8 text-center text-[10px] font-semibold tracking-[0.28em] text-white/60">
                    GENERATING / 001.PNG
                  </div>

                  <div className="absolute inset-[11%] flex items-center justify-center rounded-[1.55rem] border border-white/8 bg-black/10 px-6 py-6">
                    {outputAsset ? (
                      <MatrixRevealImage
                        src={outputAsset.imageUrl}
                        alt={languageMode === 'zh' ? '侗锦生成动画' : 'Dong brocade generation animation'}
                        className="h-full max-w-full"
                        tileCount={15}
                        rowDelayMs={115}
                        centerDelayMs={42}
                      />
                    ) : (
                      <div className="max-w-sm text-center text-sm leading-relaxed text-white/70">{copy.missingResult}</div>
                    )}
                  </div>

                  <div className="absolute inset-x-[12%] bottom-[9%]">
                    <div className="mb-4 flex items-center justify-center gap-2">
                      {copy.generatingSteps.map((step, index) => (
                        <motion.div
                          key={step}
                          className="h-2.5 w-2.5 rounded-full bg-white/40"
                          animate={{
                            scale: [1, 1.55, 1],
                            opacity: [0.35, 1, 0.35],
                          }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: index * 0.18,
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
                </div>
              )}

              {isReady && (
                <>
                  <div className="absolute inset-[8%] rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
                  <div className="absolute inset-[10%] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_rgba(88,56,70,0.28),_transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.16))]">
                    <div className="absolute inset-[8%] flex items-center justify-center rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8">
                      {outputAsset ? (
                        <motion.img
                          key={outputAsset.fileName}
                          src={outputAsset.imageUrl}
                          alt={languageMode === 'zh' ? '侗锦生成结果' : 'Dong brocade generated result'}
                          className="max-h-full max-w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]"
                          draggable={false}
                          initial={{ opacity: 0, scale: 0.96, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      ) : (
                        <div className="max-w-sm text-center text-sm leading-relaxed text-white/70">{copy.missingResult}</div>
                      )}
                    </div>
                    <div className="absolute inset-x-8 top-8 flex items-center justify-between text-[10px] font-semibold tracking-[0.24em] text-white/55">
                      <span>RESULT FILE</span>
                      <span>{outputAsset?.fileName ?? '--'}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-7 pb-8 pt-20 text-white">
                <div className="mb-3 text-[11px] font-semibold tracking-[0.26em] text-white/70">
                  {isIdle ? 'READY / RESULT / PAGE' : heroCards.map((card) => card.code).join(' / ')}
                </div>
                <h2 className="text-3xl md:text-[2.7rem] font-serif leading-[1.02]">
                  {isIdle ? copy.waitingTitle : isGenerating ? copy.generatingTitle : copy.previewTitle}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/78">
                  {isIdle ? copy.waitingSubtitle : isGenerating ? copy.generatingSubtitle : copy.previewCaption}
                </p>
              </div>
            </div>
          </section>

          <aside className="flex flex-col justify-between rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)] backdrop-blur">
            <div>
              <h1 className="text-3xl md:text-[2.5rem] font-serif leading-[1.06] text-stone-900">{copy.title}</h1>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-stone-600">{copy.subtitle}</p>

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
                onClick={onBack}
                className="rounded-full bg-stone-900 px-6 py-3 text-xs font-semibold tracking-[0.18em] text-white transition hover:bg-stone-800"
              >
                {copy.back}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!isReady || !outputAsset}
                className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white px-6 py-3 text-xs font-semibold tracking-[0.18em] text-stone-900 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
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
