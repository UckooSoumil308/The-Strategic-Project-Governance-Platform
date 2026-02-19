/**
 * Critical Path Method (CPM) Engine
 *
 * Accepts an array of task documents and computes:
 *   ES, EF, LS, LF, Float, Critical Path, and Impact Scores.
 *
 * @param {Array} tasks - Mongoose task documents
 * @param {Object} delays - Optional map of taskId → actual delay days
 * @returns {{ nodes, edges, criticalPath, projectDuration, totalImpactScore }}
 */
export function runCPM(tasks, delays = {}) {
    const idStr = (id) => id.toString();

    // ── 1. Index tasks by ID ──────────────────────────────────────────
    const taskMap = new Map();
    const adjList = new Map();   // id → [successor ids]
    const inDegree = new Map();

    for (const t of tasks) {
        const id = idStr(t._id);
        taskMap.set(id, {
            _id: id,
            title: t.title,
            duration: t.duration ?? 1,
            costPerDay: t.costPerDay ?? 0,
            dependencies: (t.dependencies || []).map((d) => idStr(d)),
            stage: t.stage,
            priority: t.priority,
        });
        adjList.set(id, []);
        inDegree.set(id, 0);
    }

    // ── 2. Build graph & edge list ────────────────────────────────────
    const edges = [];
    for (const [id, task] of taskMap) {
        for (const depId of task.dependencies) {
            if (!taskMap.has(depId)) continue;           // skip stale refs
            adjList.get(depId).push(id);
            inDegree.set(id, (inDegree.get(id) || 0) + 1);
            edges.push({ source: depId, target: id });
        }
    }

    // ── 3. Topological sort (Kahn's) ──────────────────────────────────
    const queue = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
    }

    const topoOrder = [];
    while (queue.length) {
        const curr = queue.shift();
        topoOrder.push(curr);
        for (const succ of adjList.get(curr) || []) {
            inDegree.set(succ, inDegree.get(succ) - 1);
            if (inDegree.get(succ) === 0) queue.push(succ);
        }
    }

    // If topoOrder is shorter than taskMap we have a cycle — include
    // remaining tasks at the end so the response still works.
    if (topoOrder.length < taskMap.size) {
        for (const id of taskMap.keys()) {
            if (!topoOrder.includes(id)) topoOrder.push(id);
        }
    }

    // ── 4. Forward pass (ES, EF) ──────────────────────────────────────
    const es = new Map();
    const ef = new Map();

    for (const id of topoOrder) {
        const task = taskMap.get(id);
        let maxPredEF = 0;
        for (const depId of task.dependencies) {
            if (ef.has(depId)) {
                maxPredEF = Math.max(maxPredEF, ef.get(depId));
            }
        }
        es.set(id, maxPredEF);
        ef.set(id, maxPredEF + task.duration);
    }

    // Project duration = max EF
    const projectDuration = Math.max(...[...ef.values()], 0);

    // ── 5. Backward pass (LF, LS) ─────────────────────────────────────
    const lf = new Map();
    const ls = new Map();

    // Initialise all LF to projectDuration
    for (const id of taskMap.keys()) {
        lf.set(id, projectDuration);
    }

    // Walk in reverse topological order
    for (let i = topoOrder.length - 1; i >= 0; i--) {
        const id = topoOrder[i];
        const task = taskMap.get(id);

        // LF = min(LS of all successors), or projectDuration if none
        let minSuccLS = projectDuration;
        for (const succ of adjList.get(id) || []) {
            if (ls.has(succ)) {
                minSuccLS = Math.min(minSuccLS, ls.get(succ));
            }
        }
        lf.set(id, minSuccLS);
        ls.set(id, minSuccLS - task.duration);
    }

    // ── 6. Float & Critical Path ──────────────────────────────────────
    const floatMap = new Map();
    const criticalPath = [];

    for (const id of topoOrder) {
        const slack = ls.get(id) - es.get(id);
        floatMap.set(id, slack);
        if (slack === 0) criticalPath.push(id);
    }

    // ── 7. Impact Scores ──────────────────────────────────────────────
    let totalImpactScore = 0;
    const nodes = [];

    for (const id of topoOrder) {
        const task = taskMap.get(id);
        const slack = floatMap.get(id);
        const delay = delays[id] || 0;
        const excessDelay = Math.max(0, delay - slack);
        const impactScore = task.costPerDay * excessDelay;
        totalImpactScore += impactScore;

        nodes.push({
            id,
            title: task.title,
            duration: task.duration,
            costPerDay: task.costPerDay,
            stage: task.stage,
            priority: task.priority,
            es: es.get(id),
            ef: ef.get(id),
            ls: ls.get(id),
            lf: lf.get(id),
            float: slack,
            isCritical: slack === 0,
            delay,
            impactScore,
        });
    }

    return {
        nodes,
        edges,
        criticalPath,
        projectDuration,
        totalImpactScore,
    };
}
