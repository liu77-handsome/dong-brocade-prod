export type ResultAsset = {
  publicId: string;
  fileName: string;
  fileStem: string;
  folderName: string;
  motifCardCodes: string[];
  imageUrl: string;
  loadImageUrl: () => Promise<string>;
};

const TAGGED_PATTERN_DIR = '\u7eb9\u6837\u6253\u6807';
const FINAL_EFFECT_DIR = '\u6700\u7ec8\u6548\u679c';

const finalEffectModules = import.meta.glob(
  '../../\u7eb9\u6837\u6253\u6807/*/\u6700\u7ec8\u6548\u679c/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  {
    import: 'default',
  },
) as Record<string, () => Promise<string>>;

const motifMarkerModulePaths = Object.keys(
  import.meta.glob([
    '../../\u7eb9\u6837\u6253\u6807/*/TY*/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
    '../../\u7eb9\u6837\u6253\u6807/*/DJ*/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  ]),
);

const resultAssetUrlCache = new Map<string, string>();

const parseSortNumber = (value: string) => {
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
};

const getFileStem = (fileName: string) => fileName.replace(/\.[^.]+$/, '');

const normalizePath = (value: string) => value.replace(/\\/g, '/');

const getPublicId = (folderName: string, fileStem: string) => `${folderName}__${fileStem}`;

const getFolderNameFromFinalEffectPath = (assetPath: string) => {
  const match = normalizePath(assetPath).match(
    new RegExp(`${TAGGED_PATTERN_DIR}/([^/]+)/${FINAL_EFFECT_DIR}/[^/]+$`),
  );
  return match?.[1] ?? null;
};

const getMotifCodeFromMarkerPath = (assetPath: string) => {
  const match = normalizePath(assetPath).match(
    new RegExp(`${TAGGED_PATTERN_DIR}/([^/]+)/((?:TY|DJ)\\d+)/[^/]+$`),
  );

  if (!match) {
    return null;
  }

  return {
    folderName: match[1],
    motifCode: match[2],
  };
};

const folderToMotifCodes = motifMarkerModulePaths.reduce<Record<string, Set<string>>>(
  (accumulator, assetPath) => {
    const parsed = getMotifCodeFromMarkerPath(assetPath);

    if (!parsed) {
      return accumulator;
    }

    if (!accumulator[parsed.folderName]) {
      accumulator[parsed.folderName] = new Set<string>();
    }

    accumulator[parsed.folderName].add(parsed.motifCode);
    return accumulator;
  },
  {},
);

export const RESULT_ASSETS: ResultAsset[] = Object.entries(finalEffectModules)
  .map(([assetPath, loadImageUrl]) => {
    const normalizedPath = normalizePath(assetPath);
    const fileName = normalizedPath.split('/').at(-1);
    const folderName = getFolderNameFromFinalEffectPath(assetPath);

    if (!fileName || !folderName) {
      return null;
    }

    return {
      publicId: getPublicId(folderName, getFileStem(fileName)),
      fileName,
      fileStem: getFileStem(fileName),
      folderName,
      motifCardCodes: [...(folderToMotifCodes[folderName] ?? new Set<string>())].sort(),
      imageUrl: '',
      loadImageUrl,
    } satisfies ResultAsset;
  })
  .filter((asset): asset is ResultAsset => Boolean(asset))
  .sort((left, right) => parseSortNumber(left.folderName) - parseSortNumber(right.folderName));

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
