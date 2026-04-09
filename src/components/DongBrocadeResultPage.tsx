import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { DongBrocadeCard } from '../data/dongBrocadeCards';
import { ResultAsset } from '../lib/resultAssets';
import { type LanguageMode } from '../lib/resultChannel';

type DongBrocadeResultPageProps = {
  cards: DongBrocadeCard[];
  outputAsset: ResultAsset | null;
  languageMode: LanguageMode;
  isWaiting: boolean;
  generatedAt: number | null;
  onBack: () => void;
  onLanguageChange: (languageMode: LanguageMode) => void;
};

const COPY = {
  zh: {
    badge: '结果预览',
    title: '侗锦图案结果页 Demo',
    subtitle: '结果页会在选择页点击“开始生成”后同步更新，并直接读取 result 目录里的最终图片资源。',
    back: '返回选卡',
    secondary: '保存结果',
    languageToggle: 'EN',
    previewTitle: '最终合成图',
    previewCaption: '当前结果区直接展示匹配到的结果图资源。后续只需要补充组合映射，就能切换到对应最终图。',
    sourcesTitle: '输入纹样',
    detailsTitle: '设计说明',
    waitingBadge: '等待生成',
    waitingTitle: '结果页已就绪',
    waitingSubtitle: '请先在选卡页确认 3 张纹样卡并点击“开始生成”。在收到结果前，这里会保持等待态。',
    generatedLabel: '最近生成',
    qrTitle: '手机扫码下载',
    qrReady: '扫码后会直接打开这张结果图，可在手机端保存。',
    qrLocalOnly:
      '当前二维码使用的是 localhost 地址，手机无法直接访问。请用局域网 IP 打开当前站点，或配置 VITE_PUBLIC_BASE_URL 后再扫码。',
    qrUnavailable: '二维码生成失败，请先使用下方链接。',
    downloadUrlLabel: '下载链接',
    fileLabel: '结果文件',
    missingResult: '当前没有可用的结果图片，请先把最终图片放进 result 目录。',
    details: [
      '首页与结果页通过 BroadcastChannel 和 localStorage 同步当前生成状态，不依赖后端。',
      'result 目录中的图片会被自动收集成资源列表；后续只要补组合映射，就能按选卡结果定位最终图。',
      '当前结果页已经支持生成当前图片的下载二维码，手机扫码后可直接打开原图。',
    ],
  },
  en: {
    badge: 'Result Preview',
    title: 'Dong Brocade Result Page Demo',
    subtitle: 'The result page updates after you click Start Creating and reads final image assets from the result folder directly.',
    back: 'Back',
    secondary: 'Save Result',
    languageToggle: '中文',
    previewTitle: 'Final Composition',
    previewCaption: 'The result area now renders the matched result asset directly. Later you only need to fill the combination map.',
    sourcesTitle: 'Input Motifs',
    detailsTitle: 'Design Notes',
    waitingBadge: 'Waiting',
    waitingTitle: 'Result Page Ready',
    waitingSubtitle: 'Select three motifs on the selector page and click Start Creating. This page stays in standby until a result arrives.',
    generatedLabel: 'Last Generated',
    qrTitle: 'Scan To Download',
    qrReady: 'Scanning the QR code opens the current result image directly so it can be saved on a phone.',
    qrLocalOnly:
      'This QR code currently points to localhost, which a phone cannot reach. Open the site with a LAN IP or set VITE_PUBLIC_BASE_URL first.',
    qrUnavailable: 'QR code generation failed. Use the direct link below instead.',
    downloadUrlLabel: 'Download URL',
    fileLabel: 'Result File',
    missingResult: 'No result image is available yet. Add final images to the result folder first.',
    details: [
      'The selector page and the result page sync state through BroadcastChannel and localStorage, without a backend.',
      'Images inside the result folder are collected automatically; later you only need to add combination-to-file mapping.',
      'The current result page can already generate a QR code for the active image so the phone can open the source image directly.',
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

export default function DongBrocadeResultPage({
  cards,
  outputAsset,
  languageMode,
  isWaiting,
  generatedAt,
  onBack,
  onLanguageChange,
}: DongBrocadeResultPageProps) {
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

    if (!shareInfo.downloadUrl || isWaiting) {
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
  }, [isWaiting, shareInfo.downloadUrl]);

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

        <div className="relative z-10 grid gap-8 px-6 pb-8 pt-8 md:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] md:px-8 md:pt-10">
          <section className="relative">
            <div className="mb-5 inline-flex items-center rounded-full border border-stone-900/10 bg-white/80 px-4 py-2 text-[11px] font-semibold tracking-[0.24em] text-stone-900 backdrop-blur">
              {isWaiting ? copy.waitingBadge : copy.badge}
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-stone-900/10 bg-[#140f12] shadow-[0_35px_70px_-30px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(0,0,0,0.24))]" />
              {isWaiting ? (
                <div className="absolute inset-[8%] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
                  <div className="absolute inset-x-8 top-8 flex items-center justify-between text-[10px] font-semibold tracking-[0.24em] text-white/50">
                    <span>RESULT CANVAS</span>
                    <span>STANDBY</span>
                  </div>

                  <div className="absolute inset-[10%] rounded-[1.6rem] border border-dashed border-white/18 bg-[radial-gradient(circle_at_top,_rgba(160,114,124,0.12),_transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]" />

                  <div className="absolute left-[14%] top-[18%] h-[22%] w-[32%] rounded-[1.4rem] border border-white/8 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
                  <div className="absolute right-[14%] top-[24%] h-[16%] w-[26%] rounded-[1.4rem] border border-white/8 bg-white/[0.025]" />
                  <div className="absolute left-[18%] bottom-[21%] h-[18%] w-[24%] rounded-[1.4rem] border border-white/8 bg-white/[0.025]" />

                  <div className="absolute inset-x-[16%] bottom-[18%] flex flex-col items-center text-center">
                    <div className="mb-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold tracking-[0.22em] text-white/60">
                      <span className="h-2 w-2 rounded-full bg-amber-200/80" />
                      <span>{languageMode === 'zh' ? '等待输入纹样' : 'WAITING FOR MOTIFS'}</span>
                    </div>
                    <h2 className="text-3xl font-serif text-white md:text-[2.8rem]">{copy.waitingTitle}</h2>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70">{copy.waitingSubtitle}</p>
                    <div className="mt-7 grid w-full max-w-md grid-cols-3 gap-3">
                      {[0, 1, 2].map((slot) => (
                        <div
                          key={slot}
                          className="aspect-[3/4] rounded-2xl border border-dashed border-white/14 bg-white/[0.03]"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute inset-[8%] rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
                  <div className="absolute inset-[10%] overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_rgba(88,56,70,0.28),_transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.16))]">
                    <div className="absolute inset-[8%] flex items-center justify-center rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-8">
                      {outputAsset ? (
                        <img
                          src={outputAsset.imageUrl}
                          alt={languageMode === 'zh' ? '侗锦生成结果' : 'Dong brocade generated result'}
                          className="max-h-full max-w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]"
                          draggable={false}
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
                  {isWaiting ? 'READY / RESULT / PAGE' : heroCards.map((card) => card.code).join(' / ')}
                </div>
                <h2 className="text-3xl md:text-[2.7rem] font-serif leading-[1.02]">
                  {isWaiting ? copy.waitingTitle : copy.previewTitle}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/78">
                  {isWaiting ? copy.waitingSubtitle : copy.previewCaption}
                </p>
              </div>
            </div>
          </section>

          <aside className="flex flex-col justify-between rounded-[2rem] border border-stone-900/10 bg-white/80 p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.3)] backdrop-blur">
            <div>
              <h1 className="text-3xl md:text-[2.5rem] font-serif leading-[1.06] text-stone-900">{copy.title}</h1>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-stone-600">{copy.subtitle}</p>

              {generatedAt && !isWaiting && (
                <div className="mt-6 inline-flex rounded-full bg-stone-100 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-stone-600">
                  {copy.generatedLabel} {formatGeneratedTime(generatedAt, languageMode)}
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-xs font-semibold tracking-[0.24em] text-stone-500">{copy.sourcesTitle}</h3>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {isWaiting
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

              {!isWaiting && outputAsset && (
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
                disabled={isWaiting || !outputAsset}
                className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white px-6 py-3 text-xs font-semibold tracking-[0.18em] text-stone-900 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              >
                <Download size={16} />
                {copy.secondary}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
