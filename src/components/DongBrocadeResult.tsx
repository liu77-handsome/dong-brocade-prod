import { ArrowLeft, Download } from 'lucide-react';
import { DongBrocadeCard } from '../data/dongBrocadeCards';
import resultPreviewImage from '../../result/1.png';
import { type LanguageMode } from '../lib/resultChannel';

type DongBrocadeResultProps = {
  cards: DongBrocadeCard[];
  languageMode: LanguageMode;
  isWaiting: boolean;
  generatedAt: number | null;
  onBack: () => void;
  onLanguageChange: (languageMode: LanguageMode) => void;
};

const COPY = {
  zh: {
    badge: '结果预览',
    title: '侗锦图案结果页面 Demo',
    subtitle: '这是独立的结果页。左边页面点击“开始生成”后，这里会同步显示新的侗锦结果。',
    back: '返回选卡',
    secondary: '保存结果',
    languageToggle: 'EN',
    previewTitle: '最终效果',
    previewCaption: '主视觉区域直接展示 result 目录中的结果文件。当前还未接入匹配逻辑，所以先统一使用图片 1 占位。',
    sourcesTitle: '输入纹样',
    detailsTitle: '设计说明',
    waitingBadge: '等待生成',
    waitingTitle: '结果页已就绪',
    waitingSubtitle: '请在选卡页面确认 3 张纹样并点击“开始生成”。在收到结果前，这里先展示接近真实结果页的等待首屏。',
    generatedLabel: '最近生成',
    details: [
      '结果页与选卡页是两个独立页面，通过前端消息同步当前生成内容。',
      '最终展示区域直接读取 result 目录中的结果文件，而不是重新拼接已选卡片。',
      '当前还没有完成“选中组合 -> 对应结果文件”的匹配逻辑，所以生成后暂时统一使用 result/1.png 占位。',
    ],
  },
  en: {
    badge: 'Result Preview',
    title: 'Dong Brocade Result Page Demo',
    subtitle: 'This is a standalone result page. When you click “Start Creating” on the selector page, this view updates automatically.',
    back: 'Back',
    secondary: 'Save Result',
    languageToggle: '中文',
    previewTitle: 'Final Composition',
    previewCaption: 'The main visual displays a file from the result folder directly. Matching logic is not wired yet, so image 1 is used as the placeholder for now.',
    sourcesTitle: 'Input Motifs',
    detailsTitle: 'Design Notes',
    waitingBadge: 'Waiting',
    waitingTitle: 'Result Page Ready',
    waitingSubtitle: 'Select three motifs on the selector page and click “Start Creating”. Before a result arrives, this page shows a first-screen waiting state styled like the final result page.',
    generatedLabel: 'Last Generated',
    details: [
      'The selector page and the result page are two independent pages connected through front-end messaging.',
      'The final display area reads from the result folder directly instead of rebuilding the selected motif cards.',
      'The mapping from selected combinations to result files is not implemented yet, so the generated state still uses result/1.png as a placeholder.',
    ],
  },
} as const;

const formatGeneratedTime = (timestamp: number, languageMode: LanguageMode) =>
  new Intl.DateTimeFormat(languageMode === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(timestamp);

export default function DongBrocadeResult({
  cards,
  languageMode,
  isWaiting,
  generatedAt,
  onBack,
  onLanguageChange,
}: DongBrocadeResultProps) {
  const copy = COPY[languageMode];
  const heroCards = cards.slice(0, 3);
  const outputImage = resultPreviewImage;

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
                    <span>{languageMode === 'zh' ? 'RESULT CANVAS' : 'RESULT CANVAS'}</span>
                    <span>{languageMode === 'zh' ? 'STANDBY' : 'STANDBY'}</span>
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
                      <img
                        src={outputImage}
                        alt={languageMode === 'zh' ? '侗锦生成结果' : 'Dong brocade generated result'}
                        className="max-h-full max-w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]"
                        draggable={false}
                      />
                    </div>
                    <div className="absolute inset-x-8 top-8 flex items-center justify-between text-[10px] font-semibold tracking-[0.24em] text-white/55">
                      <span>{languageMode === 'zh' ? 'RESULT FILE' : 'RESULT FILE'}</span>
                      <span>1.png</span>
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
                className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white px-6 py-3 text-xs font-semibold tracking-[0.18em] text-stone-900 transition hover:bg-stone-50"
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
