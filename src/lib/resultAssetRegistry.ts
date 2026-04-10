import {
  RESULT_ASSET_MANIFEST,
  type ResultAssetManifestEntry,
} from '../generated/resultAssetManifest';

export type ResultAsset = {
  publicId: string;
  fileName: string;
  fileStem: string;
  folderName: string;
  motifCardCodes: string[];
  imageUrl: string;
  loadImageUrl: () => Promise<string>;
};

const resultAssetUrlCache = new Map<string, string>();

const parseSortNumber = (value: string) => {
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
};

const toResultAsset = (entry: ResultAssetManifestEntry): ResultAsset => ({
  publicId: entry.publicId,
  fileName: entry.fileName,
  fileStem: entry.fileStem,
  folderName: entry.folderName,
  motifCardCodes: entry.motifCardCodes,
  imageUrl: '',
  loadImageUrl: entry.loadImageUrl,
});

export const RESULT_ASSETS: ResultAsset[] = RESULT_ASSET_MANIFEST.map(toResultAsset).sort(
  (left, right) => parseSortNumber(left.folderName) - parseSortNumber(right.folderName),
);

const getScore = (selectedCardCodes: string[], motifCardCodes: string[]) => {
  const selectedSet = new Set(selectedCardCodes);
  return motifCardCodes.reduce(
    (score, motifCode) => score + (selectedSet.has(motifCode) ? 1 : 0),
    0,
  );
};

const getStableRandomIndex = (seed: number, length: number) => {
  if (length <= 1) {
    return 0;
  }

  let state = Math.abs(Math.trunc(seed)) || 1;
  state ^= state << 13;
  state ^= state >> 17;
  state ^= state << 5;

  return Math.abs(state) % length;
};

export const resolveResultAssetImageUrl = async (asset: ResultAsset | null) => {
  if (!asset) {
    return null;
  }

  const cachedUrl = resultAssetUrlCache.get(asset.folderName);
  if (cachedUrl) {
    return cachedUrl;
  }

  const imageUrl = await asset.loadImageUrl();
  resultAssetUrlCache.set(asset.folderName, imageUrl);
  return imageUrl;
};

export const findResultAssetByPublicId = (publicId: string | null | undefined) => {
  if (!publicId) {
    return null;
  }

  return RESULT_ASSETS.find((asset) => asset.publicId === publicId) ?? null;
};

export const findResultAsset = (cardCodes: string[], randomSeed = 0) => {
  if (RESULT_ASSETS.length === 0) {
    return null;
  }

  const scoredAssets = RESULT_ASSETS.map((asset) => ({
    asset,
    score: getScore(cardCodes, asset.motifCardCodes),
  }));

  const highestScore = scoredAssets.reduce(
    (maxScore, entry) => Math.max(maxScore, entry.score),
    Number.NEGATIVE_INFINITY,
  );

  const highestScoreAssets = scoredAssets
    .filter((entry) => entry.score === highestScore)
    .map((entry) => entry.asset);

  if (highestScoreAssets.length === 0) {
    return RESULT_ASSETS[0] ?? null;
  }

  const pickedIndex = getStableRandomIndex(randomSeed, highestScoreAssets.length);
  return highestScoreAssets[pickedIndex] ?? highestScoreAssets[0] ?? null;
};
