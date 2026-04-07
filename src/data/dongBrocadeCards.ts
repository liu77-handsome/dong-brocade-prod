export interface DongBrocadeCard {
  id: number;
  code: string;
  name: string;
  group: string;
  frontImage: string;
  backImage: string;
  landscapeImage: string;
}

type CardAssetRecord = {
  id: number;
  code: string;
  name: string;
  group: string;
  frontImage?: string;
  backImage?: string;
  landscapeImage?: string;
};

const cardAssets = import.meta.glob('../assets/cards/**/*.{png,jpg,jpeg,PNG,JPG,JPEG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const parseSortNumber = (value: string) => {
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
};

const cardMap = new Map<string, CardAssetRecord>();

for (const [assetPath, assetUrl] of Object.entries(cardAssets)) {
  const normalizedPath = assetPath.replace(/\\/g, '/');
  const segments = normalizedPath.split('/');
  const group = segments[3];
  const code = segments[4];
  const fileName = segments[5];

  if (!group || !code || !fileName || fileName === '.DS_Store') {
    continue;
  }

  const key = `${group}/${code}`;
  const existing = cardMap.get(key) ?? {
    id: parseSortNumber(code),
    code,
    name: code,
    group,
  };

  if (fileName.includes('横')) {
    existing.landscapeImage = assetUrl;
  } else if (fileName.includes('背')) {
    existing.backImage = assetUrl;
  } else if (fileName.includes('正')) {
    existing.frontImage = assetUrl;
  }

  cardMap.set(key, existing);
}

export const DONG_BROCADE_CARDS: DongBrocadeCard[] = Array.from(cardMap.values())
  .filter((card) => card.frontImage && card.backImage)
  .sort((left, right) => {
    const groupDiff = parseSortNumber(left.group) - parseSortNumber(right.group);
    if (groupDiff !== 0) {
      return groupDiff;
    }

    return parseSortNumber(left.code) - parseSortNumber(right.code);
  })
  .map((card, index) => ({
    id: index + 1,
    code: card.code,
    name: card.name,
    group: card.group,
    frontImage: card.frontImage!,
    backImage: card.backImage!,
    landscapeImage: card.landscapeImage ?? card.frontImage!,
  }));
