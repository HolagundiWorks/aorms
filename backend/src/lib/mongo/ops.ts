/**
 * Suite ops store (MongoDB) — firm-scoped documents for non-drawing cloud data.
 * (Both docs this used to cite, docs/esti/MONGO-OPS.md and AORMS-SUITE.md,
 * do not exist anywhere in the repo — broken pointers, flagged not guessed
 * at; AORMS-SUITE.md's deletion is already noted elsewhere in CLAUDE.md.)
 *
 * When MONGODB_URL is empty or the driver cannot connect, falls back to an
 * in-process Map so colocated smoke still works.
 */
import { MongoClient, type Collection, type Db } from "mongodb";
import { env } from "../../env.js";

export type OpsTaskDoc = {
  _id?: string;
  firmId: string;
  projectId: string;
  taskId: string;
  title: string;
  status: string;
  updatedAt: string;
  publishedAt: string;
};

export type OpsArtifactRef = {
  firmId: string;
  projectId: string;
  entity: string;
  entityId: string;
  title: string;
  storageKey?: string;
  contentHash?: string;
  drawingPackageId?: string;
  vdbUri?: string;
  updatedAt: string;
};

type MemoryStore = {
  tasks: Map<string, OpsTaskDoc>;
  artifacts: Map<string, OpsArtifactRef>;
};

const memory: MemoryStore = {
  tasks: new Map(),
  artifacts: new Map(),
};

let client: MongoClient | null = null;
let db: Db | null = null;
let mode: "mongo" | "memory" | "uninitialized" = "uninitialized";

function taskKey(firmId: string, taskId: string) {
  return `${firmId}:${taskId}`;
}

function artKey(firmId: string, entity: string, entityId: string) {
  return `${firmId}:${entity}:${entityId}`;
}

export function mongoOpsMode(): "mongo" | "memory" | "uninitialized" {
  return mode;
}

export async function initMongoOps(): Promise<"mongo" | "memory"> {
  const url = env.MONGODB_URL?.trim() ?? "";
  if (!url) {
    mode = "memory";
    console.info("[mongo-ops] MONGODB_URL empty — using in-memory ops store");
    return mode;
  }
  try {
    client = new MongoClient(url, { serverSelectionTimeoutMS: 5_000 });
    await client.connect();
    db = client.db(env.MONGODB_DB || "aorms_ops");
    await db.collection("tasks").createIndex({ firmId: 1, projectId: 1 });
    await db.collection("tasks").createIndex({ firmId: 1, taskId: 1 }, { unique: true });
    await db.collection("published_artifacts").createIndex({ firmId: 1, projectId: 1 });
    mode = "mongo";
    console.info(`[mongo-ops] connected db=${env.MONGODB_DB || "aorms_ops"}`);
    return mode;
  } catch (e) {
    console.warn("[mongo-ops] connect failed — falling back to memory:", String(e));
    mode = "memory";
    client = null;
    db = null;
    return mode;
  }
}

function tasksCol(): Collection<OpsTaskDoc> | null {
  return db ? (db.collection("tasks") as Collection<OpsTaskDoc>) : null;
}

function artifactsCol(): Collection<OpsArtifactRef> | null {
  return db ? (db.collection("published_artifacts") as Collection<OpsArtifactRef>) : null;
}

export async function upsertOpsTask(doc: OpsTaskDoc): Promise<void> {
  const col = tasksCol();
  if (col) {
    await col.updateOne(
      { firmId: doc.firmId, taskId: doc.taskId },
      { $set: doc },
      { upsert: true },
    );
    return;
  }
  memory.tasks.set(taskKey(doc.firmId, doc.taskId), doc);
}

export async function listOpsTasksForProject(
  firmId: string,
  projectId: string,
): Promise<OpsTaskDoc[]> {
  const col = tasksCol();
  if (col) {
    return col.find({ firmId, projectId }).sort({ updatedAt: -1 }).limit(200).toArray();
  }
  return [...memory.tasks.values()]
    .filter((t) => t.firmId === firmId && t.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listOpsTasksForFirm(firmId: string, limit = 100): Promise<OpsTaskDoc[]> {
  const col = tasksCol();
  if (col) {
    return col.find({ firmId }).sort({ updatedAt: -1 }).limit(limit).toArray();
  }
  return [...memory.tasks.values()]
    .filter((t) => t.firmId === firmId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function upsertPublishedArtifact(doc: OpsArtifactRef): Promise<void> {
  const col = artifactsCol();
  if (col) {
    await col.updateOne(
      { firmId: doc.firmId, entity: doc.entity, entityId: doc.entityId },
      { $set: doc },
      { upsert: true },
    );
    return;
  }
  memory.artifacts.set(artKey(doc.firmId, doc.entity, doc.entityId), doc);
}

export async function listPublishedArtifacts(
  firmId: string,
  projectId: string,
  entity?: string,
): Promise<OpsArtifactRef[]> {
  const col = artifactsCol();
  if (col) {
    const q: Record<string, string> = { firmId, projectId };
    if (entity) q.entity = entity;
    return col.find(q).sort({ updatedAt: -1 }).limit(200).toArray();
  }
  return [...memory.artifacts.values()]
    .filter(
      (a) =>
        a.firmId === firmId &&
        a.projectId === projectId &&
        (!entity || a.entity === entity),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAllOpsForFirm(firmId: string) {
  const [tasks, artifacts] = await Promise.all([
    listOpsTasksForFirm(firmId, 500),
    (async () => {
      const col = artifactsCol();
      if (col) return col.find({ firmId }).sort({ updatedAt: -1 }).limit(500).toArray();
      return [...memory.artifacts.values()].filter((a) => a.firmId === firmId);
    })(),
  ]);
  return { mode: mongoOpsMode(), tasks, artifacts };
}
