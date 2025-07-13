title: embed-flan-t5-small-model
description: |
  Download Xenova/flan-t5-small (int8 ONNX) once, keep it in the repo, and
  wire it into the build + manifest so the browser loads it locally.
steps:
  # 1 ▸ Create download script
  - create: scripts/fetch-flan-t5.ts
    content: |
      import { mkdirSync, existsSync } from 'fs';
      import { execSync } from 'child_process';
      const OUT = 'models/flan-t5-small/onnx/int8';
      if (existsSync(`${OUT}/model.onnx`)) process.exit(0);
      mkdirSync(OUT, { recursive: true });
      execSync([
        'npx',
        '@huggingface/optimum-cli',
        'export',
        'onnx',
        '-m', 'Xenova/flan-t5-small',
        '--task', 'seq2seq-lm',
        '--quantize', 'int8',
        OUT
      ].join(' '), { stdio: 'inherit' });
      console.log('✓ flan‑t5‑small downloaded to', OUT);
  # 2 ▸ Add script to package.json
  - edit: package.json
    jq: |
      .scripts["dl-models"] = "tsx scripts/fetch-flan-t5.ts"
  # 3 ▸ Update manifest to serve local weights
  - edit: manifest.json
    merge: |
      {
        "web_accessible_resources": [
          {
            "resources": ["models/**"],
            "matches": ["<all_urls>"]
          }
        ]
      }
  # 4 ▸ Copy models into dist/ in build script
  - edit: scripts/build.ts
    snippet: |
      import { cpSync } from 'fs';
      cpSync('models', 'dist/models', { recursive: true });
  # 5 ▸ Ensure git keeps large binaries (Git LFS)
  - append: .gitattributes
    content: |
      models/**/*.onnx filter=lfs diff=lfs merge=lfs -text
acceptance:
  - After running `pnpm dl-models`, file exists: models/flan-t5-small/onnx/int8/model.onnx
  - `pnpm build` copies weights to dist/models/…
  - Zipped extension size < 30 MB (bundle‑size CI passes)
  - At runtime the browser fetches model from chrome-extension://…/models/… without network
license: Apache-2.0