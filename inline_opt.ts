import fs from "fs";
import { Worker, isMainThread, parentPort, threadId } from "worker_threads";
import os from "os";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);

if (!isMainThread) {
    parentPort!.on("message", ({ input, adjEdges, adjOffsets, startNodes }) => {
        const n = input.length;
        const visited = new Uint8Array(n);
        let currentPathLen = 0;
        const currentPathArr = new Uint8Array(n);
        let bestPathLen = 0;
        const bestPathArr = new Uint8Array(n);
        const dfs = (u: number) => {
            visited[u] = 1;
            currentPathArr[currentPathLen++] = u;
            let isLeaf = true;
            let start = adjOffsets[u];
            const end = adjOffsets[u + 1];

            while (start < end) {
                const v = adjEdges[start];
                if (!visited[v]) {
                    isLeaf = false;
                    dfs(v);
                }
                start++;
            }

            if (isLeaf && currentPathLen > bestPathLen) {
                bestPathLen = currentPathLen;
                let j = 0;
                while (j < bestPathLen) {
                    bestPathArr[j] = currentPathArr[j];
                    j++;
                }
            }

            currentPathLen--;
            visited[u] = 0;
        };

        while (startNodes.length) dfs(startNodes.pop());

        parentPort!.postMessage(bestPathArr.slice(0, bestPathLen));
    });
} else {
    const numWorkers = os.cpus().length;
    const workerPool: Worker[] = [];
    let w = 0;
    while (w < numWorkers) {
        workerPool.push(new Worker(__filename));
        w++;
    }

    (async () => {
        const args = process.argv.slice(2);
        if (args.length < 1) {
            console.error("Usage: node workers.ts <data-file>");
            process.exit(1);
        }

        const dataFile = args[0];
        const data = fs.readFileSync(dataFile, "utf-8").split("\n");
        const n = data.length;

        const start = performance.now();

        const prefixes = new Map<string, number[]>();
        let i = 0;
        while (i < n) {
            const pref = data[i].slice(0, 2);
            if (!prefixes.has(pref)) prefixes.set(pref, []);
            prefixes.get(pref)!.push(i);
            i++;
        }

        const counts = new Int32Array(n);
        let totalEdges = 0;
        i = 0;
        while (i < n) {
            const matches = prefixes.get(data[i].slice(-2)) || [];
            let j = 0;
            let c = 0;
            while (j < matches.length) {
                if (i !== matches[j]) c++;
                j++;
            }
            counts[i] = c;
            totalEdges += c;
            i++;
        }

        const adjOffsets = new Int32Array(n + 1);
        i = 0;
        while (i < n) {
            adjOffsets[i + 1] = adjOffsets[i] + counts[i];
            i++;
        }

        const adjEdges = new Int32Array(totalEdges);
        const cursor = new Int32Array(adjOffsets);

        i = 0;
        while (i < n) {
            const matches = prefixes.get(data[i].slice(-2)) || [];
            let j = 0;
            while (j < matches.length) {
                const matchIdx = matches[j];
                if (i !== matchIdx) {
                    adjEdges[cursor[i]++] = matchIdx;
                }
                j++;
            }
            i++;
        }

        const chunkSize = Math.ceil(n / numWorkers);
        const promises: Promise<number[]>[] = [];

        i = 0;
        while (i < numWorkers) {
            const startIdx = i * chunkSize;
            const endIdx = Math.min(startIdx + chunkSize, n);
            if (startIdx >= n) break;

            const startNodes = new Array(endIdx - startIdx);
            let j = 0;
            while (j < startNodes.length) {
                startNodes[j] = startIdx + j;
                j++;
            }

            promises.push(
                new Promise((resolve) => {
                    workerPool[i].once("message", resolve);
                    workerPool[i].postMessage({ input: data, adjEdges, adjOffsets, startNodes });
                }),
            );
            i++;
        }

        const results = await Promise.all(promises);
        let bestPath: number[] = [];
        i = 0;
        while (i < results.length) {
            const path = results[i];
            if (path.length > bestPath.length) bestPath = path;
            i++;
        }

        let result = "";
        if (bestPath.length > 0) {
            result = data[bestPath[0]];
            i = 1;
            while (i < bestPath.length) {
                result += data[bestPath[i]].slice(2);
                i++;
            }
        }

        const end = performance.now();

        console.log(`Result: ${result}`);
        console.log(`Time: ${(end - start).toFixed(2)} ms`);

        i = 0;
        while (i < workerPool.length) {
            await workerPool[i].terminate();
            i++;
        }
        process.exit(0);
    })();
}
