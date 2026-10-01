import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "acorn";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const safePath = (name) =>
  typeof name === "string" &&
  /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(name) &&
  !name.split("/").some((part) => part === ".." || part === ".");
const git = (cwd, args, options = {}) =>
  execFileSync("git", ["-C", cwd, ...args], {
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
const gitText = (cwd, args) => git(cwd, args, { encoding: "utf8" }).trim();
const exists = async (name) =>
  fs.access(name).then(
    () => true,
    () => false,
  );

function nodes(tree) {
  const result = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type) result.push(node);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  };
  visit(tree);
  return result;
}

/** Only the compiler's static module closure is materialized, never a full checkout. */
async function compilerTree(directory, read, prefetch) {
  const pending = ["scripts/compile-edition.mjs"];
  const files = new Map();
  const bare = new Set();
  while (pending.length) {
    const batch = [...new Set(pending.splice(0))].filter(
      (name) => !files.has(name),
    );
    prefetch(batch);
    for (const name of batch) {
      const bytes = read(name);
      files.set(name, bytes);
      await fs.mkdir(path.dirname(path.join(directory, name)), {
        recursive: true,
      });
      await fs.writeFile(path.join(directory, name), bytes);
      if (!/\.(?:mjs|js)$/.test(name)) continue;
      const tree = parse(bytes.toString("utf8"), {
        ecmaVersion: "latest",
        sourceType: "module",
      });
      for (const node of nodes(tree)) {
        if (
          [
            "ImportDeclaration",
            "ExportNamedDeclaration",
            "ExportAllDeclaration",
          ].includes(node.type) &&
          typeof node.source?.value === "string"
        ) {
          const dependency = node.source.value;
          if (/^\.\.?\//.test(dependency))
            pending.push(
              path.posix.normalize(
                path.posix.join(path.posix.dirname(name), dependency),
              ),
            );
          else if (!dependency.startsWith("node:")) bare.add(dependency);
        }
        // The compiler runtime inventory reads its reviewed demo catalog at import time.
        // Materialize literal local URL inputs too, without loading their binary closure.
        if (
          node.type === "NewExpression" &&
          node.callee?.name === "URL" &&
          typeof node.arguments[0]?.value === "string" &&
          node.arguments[1]?.object?.type === "MetaProperty"
        ) {
          const dependency = node.arguments[0].value;
          if (/^\.\.?\//.test(dependency) && /\.json$/.test(dependency))
            pending.push(
              path.posix.normalize(
                path.posix.join(path.posix.dirname(name), dependency),
              ),
            );
        }
      }
    }
  }
  await fs.writeFile(
    path.join(directory, "package.json"),
    json({ private: true, type: "module" }),
  );
  for (const dependency of bare) {
    try {
      import.meta.resolve(dependency);
    } catch {
      throw new Error(
        `Upstream compiler requires dependency ${dependency}; add and review it in package.json before syncing.`,
      );
    }
  }
  return files;
}

async function fileList(directory, prefix = "") {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink())
      throw new Error(
        `Generated application must not contain symlinks: ${name}`,
      );
    if (entry.isDirectory())
      output.push(...(await fileList(path.join(directory, entry.name), name)));
    else if (entry.isFile()) output.push(name);
    else throw new Error(`Unsupported generated entry: ${name}`);
  }
  return output.sort();
}

/** Refuse to discard edits, removed files, or additions in the generated application. */
export async function assertGeneratedClean(directory, lock) {
  if (!(await exists(directory))) {
    if (lock)
      throw new Error(
        "Generated app/ is missing. Restore it from Git before syncing.",
      );
    return;
  }
  const names = await fileList(directory);
  if (!lock?.generatedFiles) {
    if (names.length)
      throw new Error(
        "Existing app/ has no ownership manifest; refusing to replace it.",
      );
    return;
  }
  const expected = new Map(lock.generatedFiles.map((row) => [row.path, row]));
  if (
    names.length !== expected.size ||
    names.some((name) => !expected.has(name))
  )
    throw new Error(
      "Generated app/ contains added or missing files. Move custom changes into the isolation projection before syncing.",
    );
  for (const name of names) {
    const bytes = await fs.readFile(path.join(directory, name));
    const row = expected.get(name);
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256)
      throw new Error(
        `Generated app/${name} was edited. Move this change into scripts/isolate-brand.mjs before syncing.`,
      );
  }
}

const inventory = (files) =>
  [...files]
    .map(([name, bytes]) => ({
      path: name,
      bytes: bytes.length,
      sha256: sha256(bytes),
    }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));

export async function syncUpstream({ source, ref, check = false } = {}) {
  const config = JSON.parse(
    await fs.readFile(path.join(root, "brand.config.json"), "utf8"),
  );
  if (
    config.schemaVersion !== 1 ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.upstream?.repository) ||
    !/^[a-z][a-z0-9-]*$/.test(config.editionId) ||
    !/^[a-z][a-z0-9-]*$/.test(config.brandId)
  )
    throw new Error("Invalid brand.config.json.");
  const revision = ref ?? config.upstream.branch;
  if (
    typeof revision !== "string" ||
    !revision ||
    revision.startsWith("-") ||
    /[\s:~^?*\[\\]/.test(revision)
  )
    throw new Error("Use an explicit branch, tag, or commit SHA.");
  const target = path.join(root, "app");
  const lockPath = path.join(root, "upstream.lock.json");
  const oldLock = (await exists(lockPath))
    ? JSON.parse(await fs.readFile(lockPath, "utf8"))
    : null;
  await assertGeneratedClean(target, oldLock);
  const projectionFiles = new Map();
  for (const name of [
    "brand.config.json",
    "scripts/isolate-brand.mjs",
    "scripts/sync-upstream.mjs",
    "branding/access-gate.css",
    "branding/access-gate.mjs",
    "branding/coupa-landing.css",
    "branding/coupa-landing.html",
  ])
    projectionFiles.set(name, await fs.readFile(path.join(root, name)));
  await fs.mkdir(path.join(root, ".cache"), { recursive: true });
  const work = await fs.mkdtemp(path.join(root, ".cache", "upstream-sync-"));
  try {
    let repository;
    if (source) repository = await fs.realpath(path.resolve(source));
    else {
      repository = path.join(work, "objects");
      await fs.mkdir(repository);
      git(repository, ["init", "--quiet"]);
      git(repository, [
        "remote",
        "add",
        "origin",
        `https://github.com/${config.upstream.repository}.git`,
      ]);
      git(repository, ["config", "remote.origin.promisor", "true"]);
      git(repository, [
        "config",
        "remote.origin.partialclonefilter",
        "blob:none",
      ]);
      git(
        repository,
        [
          "-c",
          "protocol.version=2",
          "fetch",
          "--quiet",
          "--depth=1",
          "--filter=blob:none",
          "origin",
          revision,
        ],
        { stdio: ["ignore", "inherit", "inherit"] },
      );
    }
    const commit = gitText(repository, [
      "rev-parse",
      "--verify",
      source ? `${revision}^{commit}` : "FETCH_HEAD^{commit}",
    ]);
    if (!/^[a-f0-9]{40}$/.test(commit))
      throw new Error("Upstream did not resolve to an exact Git commit.");
    const tree = gitText(repository, ["rev-parse", `${commit}^{tree}`]);
    const objectIds = new Map(
      gitText(repository, ["ls-tree", "-r", "-z", commit])
        .split("\0")
        .filter(Boolean)
        .map((row) => {
          const [metadata, name] = row.split("\t");
          const [mode, type, id] = metadata.split(" ");
          if (type !== "blob" || mode === "120000") return [name, null];
          return [name, id];
        }),
    );
    const hydrated = new Set();
    const sourceFiles = new Map();
    const prefetch = (requestedNames) => {
      const names = [...new Set(requestedNames)].filter(
        (name) => !sourceFiles.has(name),
      );
      const ids = [
        ...new Set(
          names.map((name) => {
            const id = objectIds.get(name);
            if (!id) throw new Error(`Missing regular upstream file: ${name}`);
            return id;
          }),
        ),
      ].filter((id) => !hydrated.has(id));
      for (let index = 0; !source && index < ids.length; index += 256) {
        const batch = ids.slice(index, index + 256);
        git(
          repository,
          [
            "fetch",
            "--quiet",
            "--no-tags",
            "--no-write-fetch-head",
            "--recurse-submodules=no",
            "--filter=blob:none",
            "--stdin",
            "origin",
          ],
          {
            input: `${batch.join("\n")}\n`,
            stdio: ["pipe", "inherit", "inherit"],
          },
        );
        batch.forEach((id) => hydrated.add(id));
      }
      for (let index = 0; index < names.length; index += 32) {
        const batch = names.slice(index, index + 32);
        const output = git(repository, ["cat-file", "--batch"], {
          input: `${batch.map((name) => `${commit}:${name}`).join("\n")}\n`,
          maxBuffer: 256 * 1024 * 1024,
        });
        let offset = 0;
        for (const name of batch) {
          const lineEnd = output.indexOf(10, offset);
          const header = output.subarray(offset, lineEnd).toString("utf8");
          const match = /^([a-f0-9]{40}) blob (\d+)$/.exec(header);
          if (!match || match[1] !== objectIds.get(name))
            throw new Error(`Invalid Git object response for ${name}`);
          const size = Number(match[2]);
          if (size > 32 * 1024 * 1024 || output[lineEnd + 1 + size] !== 10)
            throw new Error(`Upstream file exceeds its byte budget: ${name}`);
          sourceFiles.set(
            name,
            Buffer.from(output.subarray(lineEnd + 1, lineEnd + 1 + size)),
          );
          offset = lineEnd + size + 2;
        }
        if (offset !== output.length)
          throw new Error("Unexpected trailing Git object data.");
      }
    };
    const read = (name) => {
      if (!safePath(name)) throw new Error(`Unsafe upstream path: ${name}`);
      if (!objectIds.get(name))
        throw new Error(
          `Upstream source must be a regular committed file: ${name}`,
        );
      if (!sourceFiles.has(name))
        sourceFiles.set(name, git(repository, ["show", `${commit}:${name}`]));
      return sourceFiles.get(name);
    };
    console.log(
      `Extracting ${config.editionId} from ${config.upstream.repository}@${commit}`,
    );
    const compilerDirectory = path.join(work, "compiler");
    const compilerInputs = await compilerTree(
      compilerDirectory,
      read,
      prefetch,
    );
    const compiler = await import(
      pathToFileURL(path.join(compilerDirectory, "scripts/compile-edition.mjs"))
        .href
    );
    const runtime = await import(
      pathToFileURL(path.join(compilerDirectory, "scripts/edition-runtime.mjs"))
        .href
    );
    const catalog = JSON.parse(read("game/editions/catalog.json"));
    const selected = compiler.selectEditionClosure(catalog, [config.editionId]);
    if (
      selected.brands.length !== 1 ||
      selected.brands[0].id !== config.brandId
    )
      throw new Error(
        "Selected edition does not belong exclusively to the configured brand.",
      );
    const engine = new Map();
    const ledger = read(runtime.EDITION_RUNTIME_ASSET_LEDGER);
    const sharedAssets = JSON.parse(ledger);
    engine.set(runtime.EDITION_RUNTIME_ASSET_LEDGER, ledger);
    // The dedicated edition exposes the same local two-player hosts as the
    // shared game. Their code still receives only the selected edition data;
    // no default-game campaign catalogs are added to the extraction.
    const pending = [
      "game/company.html",
      "game/couch/index.html",
      "game/couch/relay-rescue.html",
    ];
    while (pending.length) {
      const batch = [
        ...new Set(
          pending
            .splice(0)
            .map((name) => runtime.EDITION_RUNTIME_ADAPTERS[name] ?? name),
        ),
      ].filter((name) => !engine.has(name));
      prefetch(batch);
      for (const name of batch) {
        const bytes = read(name);
        runtime.validateEditionHostRequests(name, bytes);
        engine.set(name, bytes);
        let resources = runtime.EDITION_RUNTIME_RESOURCES[name] ?? [];
        // Avoid downloading unrelated scene originals even into the temporary object cache.
        if (name === "game/ui/menu-scene-catalog.mjs")
          resources = runtime.editionMenuSceneResources([config.editionId]);
        pending.push(
          ...compiler.editionCodeDependencies(
            name,
            runtime.projectEditionRuntimeImports(name, bytes),
          ),
          ...resources,
        );
        const asset = sharedAssets.find((record) => record.path === name);
        if (asset)
          for (const id of asset.dependencies) {
            const dependency = sharedAssets.find((record) => record.id === id);
            if (!dependency)
              throw new Error(`Missing shared runtime asset ${id}`);
            pending.push(dependency.path);
          }
      }
    }
    // Selected catalog inputs and Coupa retained media are fetched together, without
    // downloading another community's files or an upstream working tree.
    prefetch([
      ...selected.assets.map((asset) => asset.path),
      ...selected.campaigns.flatMap((campaign) =>
        [
          campaign.sourcePath,
          campaign.lessonPath,
          campaign.rewardPath,
          campaign.localizationPath,
        ].filter(Boolean),
      ),
      ...selected.editions.flatMap((edition) => [
        ...Object.values(edition.boot),
        ...(edition.presentationHistory ?? []).map((record) => record.path),
      ]),
    ]);
    const inputs = new Map(engine);
    for (const [name, bytes] of await compiler.collectEditionSelectedFiles({
      catalog,
      editionIds: [config.editionId],
      read,
    }))
      inputs.set(name, bytes);
    const upstreamPackage = JSON.parse(read("package.json"));
    const compiled = await compiler.compileEdition({
      catalog,
      editionIds: [config.editionId],
      files: inputs,
      enginePaths: [...engine.keys()],
      version: `v${upstreamPackage.version}`,
      sourceRevision: commit,
      offline: null,
    });
    const projection = await import(
      pathToFileURL(path.join(root, "scripts/isolate-brand.mjs")).href
    );
    let files = await projection.isolateBrand(compiled.files, config);
    if (!(files instanceof Map))
      throw new Error("Brand projection must return a file Map.");
    if (projection.validateBrandIsolation)
      projection.validateBrandIsolation(files, config);
    const dependencies = JSON.parse(files.get("runtime-dependencies.json"));
    dependencies.resources = dependencies.resources.filter((name) =>
      files.has(name),
    );
    files.set("runtime-dependencies.json", json(dependencies));
    compiler.validateEditionCodeClosure(files);
    files.delete("edition-build.json");
    files.set(
      "edition-build.json",
      json({
        ...compiled.manifest,
        catalogSha256: sha256(files.get("edition-catalog.json")),
        files: inventory(files),
      }),
    );
    for (const [name, bytes] of projectionFiles) {
      if (sha256(await fs.readFile(path.join(root, name))) !== sha256(bytes))
        throw new Error(
          `Projection input changed during extraction: ${name}. Run sync again after edits finish.`,
        );
    }
    const lock = {
      schemaVersion: 1,
      repository: config.upstream.repository,
      requestedRef: revision,
      commit,
      tree,
      upstreamVersion: upstreamPackage.version,
      editionId: config.editionId,
      brandId: config.brandId,
      compilerInputs: inventory(compilerInputs),
      selectedInputs: inventory(inputs),
      projectionInputs: inventory(projectionFiles),
      generatedFiles: inventory(files),
    };
    if (check) {
      const previous = oldLock?.generatedFiles;
      if (
        !previous ||
        JSON.stringify(previous) !== JSON.stringify(lock.generatedFiles)
      ) {
        const before = new Map(
          (previous ?? []).map((row) => [row.path, row.sha256]),
        );
        const after = new Map(
          lock.generatedFiles.map((row) => [row.path, row.sha256]),
        );
        const changed = [
          ...new Set([...before.keys(), ...after.keys()]),
        ].filter((name) => before.get(name) !== after.get(name));
        throw new Error(
          `Regeneration changes app/: ${changed.slice(0, 10).join(", ")}${changed.length > 10 ? ", …" : ""}. Run sync without --check to review the update.`,
        );
      }
      console.log(
        `Verified deterministic ${files.size}-file projection at ${commit}.`,
      );
      return lock;
    }
    const staged = path.join(work, "app");
    await fs.mkdir(staged);
    for (const [name, bytes] of files) {
      if (!safePath(name)) throw new Error(`Unsafe generated path: ${name}`);
      await fs.mkdir(path.dirname(path.join(staged, name)), {
        recursive: true,
      });
      await fs.writeFile(path.join(staged, name), bytes);
    }
    await assertGeneratedClean(target, oldLock);
    const backup = path.join(work, "previous-app");
    const hadTarget = await exists(target);
    if (hadTarget) await fs.rename(target, backup);
    try {
      await fs.rename(staged, target);
      const stagedLock = path.join(work, "upstream.lock.json");
      await fs.writeFile(stagedLock, json(lock));
      await fs.rename(stagedLock, lockPath);
    } catch (error) {
      if (await exists(target))
        await fs.rm(target, { recursive: true, force: true });
      if (hadTarget) await fs.rename(backup, target);
      throw error;
    }
    console.log(
      `Wrote ${files.size} isolated files (${Math.round([...files.values()].reduce((sum, bytes) => sum + bytes.length, 0) / 1024 / 1024)} MiB) to app/.`,
    );
    return lock;
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const options = {};
    for (let index = 2; index < process.argv.length; index++) {
      const flag = process.argv[index];
      if (flag === "--check") options.check = true;
      else if (["--source", "--ref"].includes(flag) && process.argv[index + 1])
        options[flag.slice(2)] = process.argv[++index];
      else
        throw new Error(
          "Usage: node scripts/sync-upstream.mjs [--source /local/upstream] [--ref main|SHA] [--check]",
        );
    }
    await syncUpstream(options);
  } catch (error) {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
