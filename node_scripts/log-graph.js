// ------------------------------------------------------------------------------------------
import { posix } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { createCanvas } from 'canvas';

import * as args from './_args.js';
import * as strs from './_strs.js';


// ------------------------------------------------------------------------------------------
export async function plot(dataFolder, filename, structures, groups, x1, z1, width, height, { dbscan = false } = {}) {
    const filepath = posix.join(dataFolder, filename);
    const filepathPng = `${filepath}.png`;

    // Adjust width and height
    let scale = 1;
    const isHorizontal = (width >= height);
    const widthMax = 10000;
    const heightMax = 10000;

    if (isHorizontal) {
        scale = widthMax / width;
        width = widthMax;
        height = height * scale;
    } else {
        scale = heightMax / height;
        width = width * scale;
        height = heightMax;
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw center point
    const centerX = (0 - x1) * scale;
    const centerZ = (0 - z1) * scale;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerZ, 10, 0, (Math.PI * 2));
    ctx.fill();

    // Draw each group
    for (const [_, group] of Object.entries(groups)) {
        const hue = Math.random() * 360;
        const colorPrimary = `hsl(${hue}, 100%, 50%)`;
        const colorSecondary = `hsl(${hue}, 100%, 40%)`;
        if (!dbscan) {
            // Draw spawn area
            const x = (group.x - x1) * scale;
            const z = (group.z - z1) * scale;

            ctx.fillStyle = colorPrimary;
            ctx.beginPath();
            ctx.arc(x, z, (args.CLUSTER_RADIUS * scale), 0, (Math.PI * 2));
            ctx.fill();

            ctx.fillStyle = colorSecondary;
            ctx.beginPath();
            ctx.arc(x, z, (group.radius * scale), 0, (Math.PI * 2));
            ctx.fill();
        } else {
            // Draw distance areas
            for (const point of group.ids) {
                const x = (structures[point].x - x1) * scale;
                const z = (structures[point].z - z1) * scale;

                ctx.fillStyle = colorSecondary;
                ctx.beginPath();
                ctx.arc(x, z, (args.CLUSTER_RADIUS * scale), 0, (Math.PI * 2));
                ctx.fill();
            }
        }

        // Draw points
        for (const point of group.ids) {
            const x = (structures[point].x - x1) * scale;
            const z = (structures[point].z - z1) * scale;

            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, z, 2, 0, (Math.PI * 2));
            ctx.fill();
        }
    }

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepathPng, buffer);
    strs.log(strs.bullet(`Saved ${chalk.yellowBright(`'${filename}.png'`)}`, { level: 1 }));
}

export async function clear(dataFolder, filename) {
    const filepath = posix.join(dataFolder, filename);
    const filepathPng = `${filepath}.png`;

    fs.removeSync(filepathPng);
}
