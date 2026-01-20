import fs from "fs";

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

class PuzzleSolver {
    private input: string[];
    private n: number;
    private adjList: number[][];
    private visited: BitSet;
    private bestPath: number[];

    constructor(input: string[]) {
        this.input = input;
        this.n = input.length;
        this.adjList = Array.from({ length: this.n }, () => []);
        this.visited = new BitSet(this.n);
        this.bestPath = [];
        this.buildGraph();
    }

    private buildGraph() {
        const prefixes = new Map<string, number[]>();

        let pref = "";
        for (let i = 0; i < this.n; i++) {
            pref = this.input[i].slice(0, 2);
            if (!prefixes.has(pref)) prefixes.set(pref, []);
            prefixes.get(pref)!.push(i);
        }

        let suffix = "";
        for (let i = 0; i < this.n; i++) {
            suffix = this.input[i].slice(-2);
            const matches = prefixes.get(suffix) || [];
            for (const matchIdx of matches) {
                if (i !== matchIdx) this.adjList[i].push(matchIdx);
            }
        }
    }

    private dfsLongestPath(u: number, currentPath: number[]) {
        this.visited.add(u);
        currentPath.push(u);

        const neighbors = this.adjList[u];
        let isLeaf = true;

        for (const v of neighbors) {
            if (this.visited.has(v)) continue;
            isLeaf = false;
            this.dfsLongestPath(v, currentPath);
        }

        if (isLeaf && currentPath.length > this.bestPath.length) {
            this.bestPath = currentPath.slice();
        }

        currentPath.pop();
        this.visited.delete(u);
    }

    solve(): string {
        for (let i = 0; i < this.n; i++) this.dfsLongestPath(i, []);

        if (this.bestPath.length === 0) return "";

        let result = this.input[this.bestPath[0]];
        for (let i = 1; i < this.bestPath.length; i++) {
            result += this.input[this.bestPath[i]].slice(2);
        }

        return result;
    }
}

function main(args: string[]) {
    if (args.length < 1) {
        console.error("Usage: node index.ts <data-file>");
        process.exit(1);
    }
    const dataFile = args[0];
    const data = fs.readFileSync(dataFile, "utf-8").split("\n");

    const start = performance.now();
    const solver = new PuzzleSolver(data);
    const result = solver.solve();
    const end = performance.now();

    console.log(`Result: ${result}`);
    console.log(`Time: ${(end - start).toFixed(2)} ms`);
}

main(process.argv.slice(2));
