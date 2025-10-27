// ------------------------------------------------------------------------------------------
import { posix } from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import papa from 'papaparse';
import clustering from 'density-clustering';
import { packEnclose } from 'd3-hierarchy';

import * as args from './_args.js';
import * as strs from './_strs.js';
import * as logData from './log-data.js';
import * as logGraph from './log-graph.js';


// ------------------------------------------------------------------------------------------
async function extractCSV(fileData) {
    const lines = fileData.split('\n');

    function findMetadata(prefix) {
        const value = lines.find(line => line.startsWith(prefix));
        return value.split(';')[1];
    }
    function findDataIndex(prefix) {
        return lines.findIndex(line => line.startsWith(prefix));
    }

    // Get Metadata
    const x1 = findMetadata('#X1');
    const z1 = findMetadata('#Z1');
    const x2 = findMetadata('#X2');
    const z2 = findMetadata('#Z2');
    const width = Math.abs(x2 - x1);
    const height = Math.abs(z2 - z1);

    // strs.log(strs.bullet(`X1: ${chalk.blueBright(x1)}, X2: ${chalk.blueBright(x2)}`, { level: 1 }));
    // strs.log(strs.bullet(`Z1: ${chalk.blueBright(z1)}, Z2: ${chalk.blueBright(z2)}`, { level: 1 }));

    // Remove metadata lines
    const dataStartIndex = findDataIndex('seed;structure;x;z;details');
    const dataCSV = lines.slice(dataStartIndex).join('\n');
    const dataParsed = papa.parse(dataCSV, { header: true, delimiter: ';', skipEmptyLines: true }).data;

    return { x1: x1, z1: z1, width: width, height: height, data: dataParsed };
}

async function parseCSV(data) {
    // Filter structures
    let dataFiltered = data.filter(row => args.FILTER.includes(row.structure));
    dataFiltered = dataFiltered.map(row => ({
        structure: row.structure,
        x: parseFloat(row.x),
        z: parseFloat(row.z),
    }));

    return dataFiltered;
}


// ------------------------------------------------------------------------------------------
async function clusterStructures(structures) {
    let clustersCount = 0;
    let clusters = {};

    // Run DBSCAN
    const dataset = structures.map(structure => [structure.x, structure.z]);
    const dbscan = new clustering.DBSCAN();
    const dbscanClusters = dbscan.run(dataset, (args.CLUSTER_RADIUS * 2), 2);
    const dbscanNoise = dbscan.noise;

    // Convert output
    for (const cluster of dbscanClusters) {
        let d3Points = [];
        for (const item of cluster) {
            const structure = structures[item];
            d3Points.push({ x: structure.x, y: structure.z, r: 0 });
        }
        const { x, y, r } = packEnclose(d3Points);

        clustersCount++;
        clusters[cluster.join('-')] = {
            x: x,
            z: y,
            radius: r,
            distance: Math.hypot(x, y),
            ids: cluster
        };
    }

    return { clustersCount: clustersCount, clusters: clusters, noise: dbscanNoise };
}

async function groupStructures(structures, clusters) {
    let groupsCount = 0;
    let groups = {};

    // Helper: Get combinations of specific size
    function getCombinationsOfSize(items, size) {
        if (size == 0 || size > items.length) return [[]];
        if (size == items.length) return [items];

        let results = [];

        for (let i = 0; i <= items.length - size; i++) {
            let head = items[i];
            let tailCombos = getCombinationsOfSize(items.slice(i + 1), size - 1);

            for (let combo of tailCombos) {
                results.push([head, ...combo]);
            }
        }

        return results;
    }

    for (const [_, cluster] of Object.entries(clusters)) {
        // Get all cluster combinations by combination size
        let combinations = [];
        for (let size = 2; size <= cluster.ids.length; size++) {
            combinations.push(...getCombinationsOfSize(cluster.ids, size));
        }

        // Process each combination
        for (const combination of combinations) {
            let comboD3Points = [];
            for (const item of combination) {
                const structure = structures[item];
                comboD3Points.push({ x: structure.x, y: structure.z, r: 0 });
            }

            const { x, y, r } = packEnclose(comboD3Points);
            if (r <= args.CLUSTER_RADIUS) {
                groupsCount++;
                groups[combination.join('-')] = {
                    x: x,
                    z: y,
                    radius: r,
                    distance: Math.hypot(x, y),
                    ids: combination
                };

                // Delete previous sized groups
                for (const subCombination of getCombinationsOfSize(combination, combination.length - 1)) {
                    if (groups[subCombination.join('-')]) {
                        groupsCount--;
                        delete groups[subCombination.join('-')];
                    }
                }
            }
        }
    }

    return { groupsCount: groupsCount, groups: groups };
}


// ------------------------------------------------------------------------------------------
export async function main(dataFolder, fileData) {
    // Clear results
    await logData.clear(dataFolder, 'dbscan');
    await logData.clear(dataFolder, 'results');
    await logGraph.clear(dataFolder, 'dbscan');
    await logGraph.clear(dataFolder, 'results');

    // Get data
    const { x1, z1, width, height, data } = await extractCSV(fileData);
    strs.log(strs.bullet(`Offset (${chalk.blueBright(x1)}, ${chalk.blueBright(z1)}) | Dimensions (${chalk.blueBright(width)}, ${chalk.blueBright(height)})`, { level: 1 }));

    strs.log(strs.bullet(`Extracted ${chalk.blueBright(data.length)} structures`, { level: 1 }));
    const structures = await parseCSV(data);
    strs.log(strs.bullet(`Processing ${chalk.blueBright(structures.length)} structures`, { level: 1 }));

    const { clustersCount, clusters, noise } = await clusterStructures(structures);
    strs.log(strs.bullet(`Found ${chalk.blueBright(clustersCount)} clusters`, { level: 1 }));
    strs.log(strs.bullet(`Found ${chalk.blueBright(noise.length)} noise points`, { level: 1 }));
    const { groupsCount, groups } = await groupStructures(structures, clusters, { level: 1 });
    strs.log(strs.bullet(`Found ${chalk.blueBright(groupsCount)} grouped structures`, { level: 1 }));

    // Log clusters
    if (args.DEBUG_DBSCAN) {
        await logData.write(dataFolder, 'dbscan', structures, clusters);
    }
    await logData.write(dataFolder, 'results', structures, groups);

    // Plot clusters
    if (args.DEBUG_PLOT) {
        if (args.DEBUG_DBSCAN) {
            await logGraph.plot(dataFolder, 'dbscan', structures, clusters, x1, z1, width, height, { dbscan: true });
        }
        await logGraph.plot(dataFolder, 'results', structures, groups, x1, z1, width, height);
    }
}
