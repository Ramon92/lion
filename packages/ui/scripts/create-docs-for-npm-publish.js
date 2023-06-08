import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { globby } from 'globby';
import { fileURLToPath } from 'url';

const monoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const lionUiPkgRoot = fileURLToPath(new URL('../', import.meta.url));

const monoDocsRoot = fileURLToPath(new URL('../../../docs', import.meta.url));
const localDocsRoot = fileURLToPath(new URL('../docs', import.meta.url));
const foldersWeAreInterestedIn = ['components', 'fundamentals', 'guides'];

/**
 * @param {string} rootPath
 * @returns {object|undefined}
 */
function getPackageJson(rootPath) {
  try {
    const fileContent = fs.readFileSync(`${rootPath}/package.json`, 'utf8');
    return JSON.parse(fileContent);
  } catch {
    return undefined;
  }
}

async function sanityCheck() {
  const pkgJsonMonoRoot = getPackageJson(monoRoot);
  const pkgJsonLionUi = getPackageJson(lionUiPkgRoot);

  if (pkgJsonMonoRoot?.name !== '@lion/root' || pkgJsonLionUi.name !== '@lion/ui') {
    throw new Error(
      'It seems like this script has moved. Adjust variables "monoRoot" and/or "lionUiPkgRoot"',
    );
  }
}

async function generateMdFilesWithSourceReferrals() {
  const mdPaths = await globby(`${monoDocsRoot}/{${foldersWeAreInterestedIn.join(',')}}/**/*.md`, {
    nodir: true,
  });

  for (const mdPath of mdPaths) {
    const localPath = mdPath.replace(monoDocsRoot, '');
    const newDestination = `${localDocsRoot}${localPath}`;
    const relSrcPath = path.relative(path.dirname(newDestination), monoDocsRoot);
    await fs.promises.mkdir(path.dirname(newDestination), { recursive: true });
    // Make it ready for publish-docs
    await fs.promises.writeFile(newDestination, `[=> See Source <=](${relSrcPath}${localPath})`);
  }
}

async function copyDocAssets() {
  // Folders generated by Rocket
  const originalAssetPaths = await globby([
    `${monoDocsRoot}/{${foldersWeAreInterestedIn.join(',')}}/**/**/*.{js,cjs,mjs}`,
  ]);

  for (const originalAssetPath of originalAssetPaths) {
    const localPath = originalAssetPath.replace(monoDocsRoot, '');

    // don't handle private folders and Rocket specifics
    if (localPath.startsWith('/_') || originalAssetPath.endsWith('11tydata.cjs')) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const newDestination = `${localDocsRoot}${localPath}`;

    await fs.promises.mkdir(path.dirname(newDestination), { recursive: true });
    fs.promises.copyFile(originalAssetPath, newDestination);
  }
}

await sanityCheck();
await generateMdFilesWithSourceReferrals();
await copyDocAssets();