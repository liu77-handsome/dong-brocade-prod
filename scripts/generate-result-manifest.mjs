import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const taggedPatternDir = path.join(repoRoot, '纹样打标');
const outputDir = path.join(repoRoot, 'src', 'generated');
const outputFile = path.join(outputDir, 'resultAssetManifest.ts');

const imagePattern = /\.(png|jpg|jpeg|webp)$/i;
const motifDirPattern = /^(TY|DJ)\d+$/i;
const finalEffectDirName = '最终效果';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const toPosixPath = (value) => value.replace(/\\/g, '/');
const getFileStem = (fileName) => fileName.replace(/\.[^.]+$/, '');

const folderNames = fs.existsSync(taggedPatternDir)
  ? fs
      .readdirSync(taggedPatternDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
      )
  : [];

const manifestEntries = folderNames
  .map((folderName) => {
    const folderPath = path.join(taggedPatternDir, folderName);
    const childEntries = fs.readdirSync(folderPath, { withFileTypes: true });

    const motifCardCodes = childEntries
      .filter((entry) => entry.isDirectory() && motifDirPattern.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
      );

    const finalEffectDir = childEntries.find(
      (entry) => entry.isDirectory() && entry.name === finalEffectDirName,
    );

    if (!finalEffectDir) {
      return null;
    }

    const finalEffectDirPath = path.join(folderPath, finalEffectDir.name);
    const finalImage = fs
      .readdirSync(finalEffectDirPath, { withFileTypes: true })
      .find((entry) => entry.isFile() && imagePattern.test(entry.name));

    if (!finalImage) {
      return null;
    }

    const fileName = finalImage.name;
    const fileStem = getFileStem(fileName);
    const importPath = toPosixPath(
      path.relative(outputDir, path.join(finalEffectDirPath, fileName)),
    );

    return {
      publicId: `${folderName}__${fileStem}`,
      fileName,
      fileStem,
      folderName,
      motifCardCodes,
      importPath: importPath.startsWith('.') ? importPath : `./${importPath}`,
    };
  })
  .filter(Boolean);

const output = `export type ResultAssetManifestEntry = {
  publicId: string;
  fileName: string;
  fileStem: string;
  folderName: string;
  motifCardCodes: string[];
  loadImageUrl: () => Promise<string>;
};

export const RESULT_ASSET_MANIFEST: ResultAssetManifestEntry[] = [
${manifestEntries
  .map(
    (entry) => `  {
    publicId: ${JSON.stringify(entry.publicId)},
    fileName: ${JSON.stringify(entry.fileName)},
    fileStem: ${JSON.stringify(entry.fileStem)},
    folderName: ${JSON.stringify(entry.folderName)},
    motifCardCodes: ${JSON.stringify(entry.motifCardCodes)},
    loadImageUrl: () => import(${JSON.stringify(entry.importPath)}).then((module) => module.default),
  },`,
  )
  .join('\n')}
];
`;

ensureDir(outputDir);
fs.writeFileSync(outputFile, output, 'utf8');

console.log(`Generated ${manifestEntries.length} result assets in ${path.relative(repoRoot, outputFile)}`);
