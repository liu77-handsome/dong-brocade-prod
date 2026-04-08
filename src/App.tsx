/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import DongBrocadeHero from './components/DongBrocadeHero';
import DongBrocadeResult from './components/DongBrocadeResult';
import { DONG_BROCADE_CARDS } from './data/dongBrocadeCards';
import {
  LanguageMode,
  publishResult,
  subscribeToResult,
  type ResultPayload,
} from './lib/resultChannel';

type AppRoute = {
  page: 'hero' | 'result';
};

const parseRoute = (): AppRoute => {
  const url = new URL(window.location.href);
  if (url.pathname === '/result') {
    return {
      page: 'result',
    };
  }

  return {
    page: 'hero',
  };
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());
  const [languageMode, setLanguageMode] = useState<LanguageMode>('zh');
  const [resultPayload, setResultPayload] = useState<ResultPayload | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (route.page !== 'result') {
      return;
    }

    setResultPayload(null);

    return subscribeToResult((nextPayload) => {
      setResultPayload(nextPayload);
      setLanguageMode(nextPayload.languageMode);
    });
  }, [route.page]);

  const handleStart = (cardCodes: string[], nextLanguageMode: LanguageMode) => {
    publishResult({
      cardCodes,
      languageMode: nextLanguageMode,
      generatedAt: Date.now(),
    });
    setLanguageMode(nextLanguageMode);
  };

  const handleBack = () => {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '';
    window.history.pushState({}, '', url);
    setRoute({ page: 'hero' });
  };

  const resultCards = useMemo(() => {
    const cardMap = new Map(DONG_BROCADE_CARDS.map((card) => [card.code, card]));
    return (resultPayload?.cardCodes ?? [])
      .map((code) => cardMap.get(code))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));
  }, [resultPayload]);

  return (
    <main className="min-h-screen">
      {route.page === 'result' ? (
        <DongBrocadeResult
          cards={resultCards}
          languageMode={languageMode}
          isWaiting={!resultPayload || resultCards.length === 0}
          generatedAt={resultPayload?.generatedAt ?? null}
          onBack={handleBack}
          onLanguageChange={setLanguageMode}
        />
      ) : (
        <DongBrocadeHero
          languageMode={languageMode}
          onLanguageChange={setLanguageMode}
          onStart={handleStart}
        />
      )}
    </main>
  );
}
