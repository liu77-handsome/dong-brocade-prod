/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import DongBrocadeHero from './components/DongBrocadeHero';
import DongBrocadeDownloadPage from './components/DongBrocadeDownloadPage';
import DongBrocadeResult from './components/DongBrocadeResultGallery';
import { DONG_BROCADE_CARDS } from './data/dongBrocadeCards';
import { findResultAsset } from './lib/resultAssetRegistry';
import {
  LanguageMode,
  publishResult,
  readStoredResult,
  subscribeToResult,
  type ResultStatus,
  type ResultPayload,
} from './lib/resultChannel';

type AppRoute = {
  page: 'hero' | 'result' | 'download';
  assetId?: string | null;
  languageMode?: LanguageMode;
};

const GENERATION_DURATION_MS = 8200;

const parseLanguageMode = (requestedLanguage: string | null): LanguageMode =>
  requestedLanguage === 'en' ? 'en' : 'zh';

const parseHashRoute = (url: URL): AppRoute | null => {
  const rawHash = url.hash.replace(/^#/, '');
  if (!rawHash) {
    return null;
  }

  const normalizedHash = rawHash.startsWith('/') ? rawHash : `/${rawHash}`;
  const hashUrl = new URL(normalizedHash, url.origin);
  const routeLanguageMode = parseLanguageMode(hashUrl.searchParams.get('lang'));

  if (hashUrl.pathname === '/download') {
    return {
      page: 'download',
      assetId: hashUrl.searchParams.get('asset'),
      languageMode: routeLanguageMode,
    };
  }

  if (hashUrl.pathname === '/result') {
    return {
      page: 'result',
      languageMode: routeLanguageMode,
    };
  }

  if (hashUrl.pathname === '/') {
    return {
      page: 'hero',
      languageMode: routeLanguageMode,
    };
  }

  return null;
};

const parseRoute = (): AppRoute => {
  const url = new URL(window.location.href);
  const hashRoute = parseHashRoute(url);
  if (hashRoute) {
    return hashRoute;
  }

  const routeLanguageMode = parseLanguageMode(url.searchParams.get('lang'));

  if (url.pathname === '/download') {
    return {
      page: 'download',
      assetId: url.searchParams.get('asset'),
      languageMode: routeLanguageMode,
    };
  }

  if (url.pathname === '/result') {
    return {
      page: 'result',
      languageMode: routeLanguageMode,
    };
  }

  return {
    page: 'hero',
    languageMode: routeLanguageMode,
  };
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());
  const [languageMode, setLanguageMode] = useState<LanguageMode>(
    () => parseRoute().languageMode ?? 'zh',
  );
  const [resultPayload, setResultPayload] = useState<ResultPayload | null>(null);
  const generationTimeoutRef = useRef<number | null>(null);

  const handleLanguageChange = (nextLanguageMode: LanguageMode) => {
    setLanguageMode(nextLanguageMode);

    if (route.page === 'result' && resultPayload) {
      const nextPayload: ResultPayload = {
        ...resultPayload,
        languageMode: nextLanguageMode,
      };

      setResultPayload(nextPayload);
      publishResult(nextPayload);
    }
  };

  const startGeneration = (cardCodes: string[], nextLanguageMode: LanguageMode) => {
    const requestedAt = Date.now();
    const generatingPayload: ResultPayload = {
      cardCodes,
      languageMode: nextLanguageMode,
      status: 'generating',
      requestedAt,
      generatedAt: null,
    };

    if (generationTimeoutRef.current !== null) {
      window.clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }

    publishResult(generatingPayload);
    setResultPayload(generatingPayload);
    setLanguageMode(nextLanguageMode);
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseRoute();
      setRoute(nextRoute);
      if (nextRoute.languageMode) {
        setLanguageMode(nextRoute.languageMode);
      }
    };

    const handleHashChange = () => {
      const nextRoute = parseRoute();
      setRoute(nextRoute);
      if (nextRoute.languageMode) {
        setLanguageMode(nextRoute.languageMode);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (route.page !== 'result') {
      return;
    }

    setResultPayload(readStoredResult());

    return subscribeToResult((nextPayload) => {
      setResultPayload(nextPayload);
      setLanguageMode(nextPayload.languageMode);
    });
  }, [route.page]);

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current !== null) {
        window.clearTimeout(generationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (route.page !== 'result' || resultPayload?.status !== 'generating') {
      if (generationTimeoutRef.current !== null) {
        window.clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
      }
      return;
    }

    const remainingMs = Math.max(
      0,
      resultPayload.requestedAt + GENERATION_DURATION_MS - Date.now(),
    );

    if (generationTimeoutRef.current !== null) {
      window.clearTimeout(generationTimeoutRef.current);
    }

    generationTimeoutRef.current = window.setTimeout(() => {
      const readyPayload: ResultPayload = {
        ...resultPayload,
        status: 'ready',
        generatedAt: Date.now(),
      };

      publishResult(readyPayload);
      setResultPayload(readyPayload);
      generationTimeoutRef.current = null;
    }, remainingMs);

    return () => {
      if (generationTimeoutRef.current !== null) {
        window.clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
      }
    };
  }, [resultPayload, route.page]);

  useEffect(() => {
    const titleMap = {
      zh: {
        hero: '侗锦图元选择页',
        result: '侗锦纹样生成页',
        download: '侗锦纹样下载页',
      },
      en: {
        hero: 'Dong Brocade Motif Selector',
        result: 'Dong Brocade Pattern Generator',
        download: 'Dong Brocade Download',
      },
    } as const;

    document.title = titleMap[languageMode][route.page];
  }, [languageMode, route.page]);

  const handleStart = (cardCodes: string[], nextLanguageMode: LanguageMode) => {
    startGeneration(cardCodes, nextLanguageMode);
  };

  const handleRegenerate = () => {
    if (!resultPayload || resultPayload.cardCodes.length === 0) {
      return;
    }

    startGeneration(resultPayload.cardCodes, languageMode);
  };

  const handleBack = () => {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '';
    url.hash = '/';
    window.history.pushState({}, '', url);
    setRoute({ page: 'hero' });
  };

  const resultCards = useMemo(() => {
    const cardMap = new Map(DONG_BROCADE_CARDS.map((card) => [card.code, card]));
    return (resultPayload?.cardCodes ?? [])
      .map((code) => cardMap.get(code))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));
  }, [resultPayload]);
  const resultAsset = useMemo(
    () => findResultAsset(resultPayload?.cardCodes ?? [], resultPayload?.requestedAt ?? 0),
    [resultPayload],
  );
  const generationStatus: ResultStatus | 'idle' =
    resultPayload && resultCards.length > 0 ? resultPayload.status : 'idle';

  return (
    <main className="min-h-screen">
      {route.page === 'result' ? (
        <DongBrocadeResult
          cards={resultCards}
          outputAsset={resultAsset}
          languageMode={languageMode}
          generationStatus={generationStatus}
          generationKey={resultPayload?.requestedAt ?? 0}
          generatedAt={resultPayload?.generatedAt ?? null}
          onBack={handleBack}
          onLanguageChange={handleLanguageChange}
          onRegenerate={handleRegenerate}
        />
      ) : route.page === 'download' ? (
        <DongBrocadeDownloadPage
          assetId={route.assetId ?? null}
          languageMode={languageMode}
        />
      ) : (
        <DongBrocadeHero
          languageMode={languageMode}
          onLanguageChange={handleLanguageChange}
          onStart={handleStart}
        />
      )}
    </main>
  );
}
