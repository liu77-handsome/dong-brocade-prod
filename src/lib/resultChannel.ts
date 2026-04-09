export type LanguageMode = 'zh' | 'en';
export type ResultStatus = 'generating' | 'ready';

export type ResultPayload = {
  cardCodes: string[];
  languageMode: LanguageMode;
  status: ResultStatus;
  requestedAt: number;
  generatedAt: number | null;
};

const RESULT_CHANNEL_NAME = 'dong-brocade-result-channel';
const RESULT_STORAGE_KEY = 'dong-brocade-result-state';

const isLanguageMode = (value: unknown): value is LanguageMode => value === 'zh' || value === 'en';
const isResultStatus = (value: unknown): value is ResultStatus => value === 'generating' || value === 'ready';

const isResultPayload = (value: unknown): value is ResultPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<ResultPayload>;
  return (
    Array.isArray(payload.cardCodes) &&
    payload.cardCodes.every((cardCode) => typeof cardCode === 'string') &&
    isLanguageMode(payload.languageMode) &&
    isResultStatus(payload.status) &&
    typeof payload.requestedAt === 'number' &&
    (typeof payload.generatedAt === 'number' || payload.generatedAt === null)
  );
};

const parsePayload = (rawValue: string | null): ResultPayload | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isResultPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const readStoredResult = (): ResultPayload | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return parsePayload(window.localStorage.getItem(RESULT_STORAGE_KEY));
};

export const publishResult = (payload: ResultPayload) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(payload));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(RESULT_CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  }
};

export const subscribeToResult = (onMessage: (payload: ResultPayload) => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== RESULT_STORAGE_KEY) {
      return;
    }

    const payload = parsePayload(event.newValue);
    if (payload) {
      onMessage(payload);
    }
  };

  window.addEventListener('storage', handleStorage);

  let channel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(RESULT_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<ResultPayload>) => {
      if (isResultPayload(event.data)) {
        onMessage(event.data);
      }
    };
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
};
