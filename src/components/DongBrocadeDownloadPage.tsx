import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import {
  findResultAssetByPublicId,
  resolveResultAssetImageUrl,
} from '../lib/resultAssets';
import { type LanguageMode } from '../lib/resultChannel';

type DongBrocadeDownloadPageProps = {
  assetId: string | null;
  languageMode: LanguageMode;
};

const COPY = {
  zh: {
    loadingTitle: '正在准备下载链接',
    loadingSubtitle: '页面会自动跳转到对应的纹样成图，请稍候。',
    missingTitle: '未找到对应结果图',
    missingSubtitle: '当前下载链接无效，或该结果图已不存在。',
    openImage: '打开图片',
    downloadImage: '下载图片',
    directLink: '图片直链',
  },
  en: {
    loadingTitle: 'Preparing download link',
    loadingSubtitle:
      'This page will redirect to the matched pattern image automatically.',
    missingTitle: 'Result image not found',
    missingSubtitle:
      'This download link is invalid or the referenced result image is no longer available.',
    openImage: 'Open Image',
    downloadImage: 'Download Image',
    directLink: 'Direct URL',
  },
} as const;

export default function DongBrocadeDownloadPage({
  assetId,
  languageMode,
}: DongBrocadeDownloadPageProps) {
  const copy = COPY[languageMode];
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const asset = useMemo(() => findResultAssetByPublicId(assetId), [assetId]);

  useEffect(() => {
    let isCancelled = false;

    if (!asset) {
      setResolvedImageUrl(null);
      return () => {
        isCancelled = true;
      };
    }

    resolveResultAssetImageUrl(asset)
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
  }, [asset]);

  useEffect(() => {
    if (!resolvedImageUrl) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.replace(resolvedImageUrl);
    }, 480);

    return () => window.clearTimeout(timer);
  }, [resolvedImageUrl]);

  if (!asset) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-6 py-10">
        <div className="w-full max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)]">
          <h1 className="text-2xl font-semibold text-stone-900">{copy.missingTitle}</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">{copy.missingSubtitle}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-6 py-10">
      <div className="w-full max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)] md:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-900">{copy.loadingTitle}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-stone-600">
            {resolvedImageUrl ? copy.loadingSubtitle : copy.loadingTitle}
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-stone-200 bg-stone-50">
          {resolvedImageUrl ? (
            <img
              src={resolvedImageUrl}
              alt={asset.fileName}
              className="max-h-[60vh] w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center px-6 text-sm text-stone-500">
              {copy.loadingSubtitle}
            </div>
          )}
        </div>

        {resolvedImageUrl && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-stone-100 px-4 py-3 text-xs leading-6 text-stone-700">
              <div className="font-medium text-stone-900">{copy.directLink}</div>
              <div className="mt-1 break-all">{resolvedImageUrl}</div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={resolvedImageUrl}
                target="_self"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-stone-900/10 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
              >
                <ExternalLink size={16} />
                {copy.openImage}
              </a>
              <a
                href={resolvedImageUrl}
                download={asset.fileName}
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                <Download size={16} />
                {copy.downloadImage}
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
