import fs from "fs";
import { Worker, isMainThread, parentPort, threadId } from "worker_threads";
import os from "os";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);

class BitSet {
    private data: Uint32Array;

    constructor(size: number) {
        this.data = new Uint32Array(Math.ceil(size / 32));
    }

    add(idx: number) {
        this.data[idx >>> 5] |= 1 << (idx & 31);
    }

    has(idx: number): boolean {
        return !!(this.data[idx >>> 5] & (1 << (idx & 31)));
    }

    delete(idx: number) {
        this.data[idx >>> 5] &= ~(1 << (idx & 31));
    }
}
class PathFinder {
    // private input: string[];
    private adjList: number[][];
    private visited: BitSet;
    private bestPath: number[];
    private currentPathArr: number[];
    private currentPathLen: number;

    constructor(input: string[], adjList: number[][]) {
        // this.input = input;
        this.adjList = adjList;
        this.visited = new BitSet(input.length);
        this.currentPathArr = new Array(input.length);
        this.currentPathLen = 0;
        this.bestPath = [];
    }

    private dfsLongestPath(u: number) {
        this.visited.add(u);
        this.currentPathArr[this.currentPathLen++] = u;

        const neighbors = this.adjList[u];
        let isLeaf = true;

        for (let i = 0; i < neighbors.length; i++) {
            const v = neighbors[i];
            if (!this.visited.has(v)) {
                isLeaf = false;
                this.dfsLongestPath(v);
            }
        }

        if (isLeaf && this.currentPathLen > this.bestPath.length) {
            this.bestPath = this.currentPathArr.slice(0, this.currentPathLen);
        }

        this.currentPathLen--;
        this.visited.delete(u);
    }

    findBest(startNodes: number[]): number[] {
        for (let i = 0; i < startNodes.length; i++) {
            this.dfsLongestPath(startNodes[i]);
        }
        return this.bestPath;
    }
}

function buildGraph(input: string[]): number[][] {
    const n = input.length;
    const adjList: number[][] = Array.from({ length: n }, () => []);
    const prefixes = new Map<string, number[]>();

    for (let i = 0; i < n; i++) {
        const pref = input[i].slice(0, 2);
        if (!prefixes.has(pref)) prefixes.set(pref, []);
        prefixes.get(pref)!.push(i);
    }

    for (let i = 0; i < n; i++) {
        const suffix = input[i].slice(-2);
        const matches = prefixes.get(suffix) || [];
        for (const matchIdx of matches) {
            if (i !== matchIdx) adjList[i].push(matchIdx);
        }
    }

    // console.table(adjList);
    return adjList;
}

function pathToString(path: number[], input: string[]): string {
    if (path.length === 0) return "";
    let result = input[path[0]];
    for (let i = 1; i < path.length; i++) {
        result += input[path[i]].slice(2);
    }
    return result;
}

if (!isMainThread) {
    parentPort!.on("message", ({ input, adjList, startNodes }) => {
        const finder = new PathFinder(input, adjList);
        const bestPath = finder.findBest(startNodes);
        parentPort!.postMessage(bestPath);
    });
} else {
    const numWorkers = os.cpus().length;
    const workerPool: Worker[] = [];

    for (let i = 0; i < numWorkers; i++) {
        workerPool.push(new Worker(__filename));
    }
    async function solve(input: string[], adjList: number[][]): Promise<number[]> {
        const n = input.length;
        const chunkSize = Math.ceil(n / numWorkers);
        const promises: Promise<number[]>[] = [];

        for (let i = 0; i < numWorkers; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, n);
            if (start >= n) break;

            const startNodes = Array.from({ length: end - start }, (_, j) => start + j);

            promises.push(
                new Promise((resolve) => {
                    workerPool[i].once("message", resolve);
                    workerPool[i].postMessage({ input, adjList, startNodes });
                }),
            );
        }

        const results = await Promise.all(promises);
        return results.reduce((best, path) => (path.length > best.length ? path : best), []);
    }

    async function main(args: string[]) {
        if (args.length < 1) {
            console.error("Usage: node workers.ts <data-file>");
            process.exit(1);
        }

        const dataFile = args[0];
        const data = fs.readFileSync(dataFile, "utf-8").split("\n");

        const start = performance.now();
        const adjList = buildGraph(data);
        const bestPath = await solve(data, adjList);
        const end = performance.now();

        const result = pathToString(bestPath, data);
        console.log(`Result: ${result}`);
        console.log(`Time: ${(end - start).toFixed(2)} ms`);

        for (const worker of workerPool) await worker.terminate();
        process.exit(0);
    }

    main(process.argv.slice(2));
}
