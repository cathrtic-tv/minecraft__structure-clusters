// ------------------------------------------------------------------------------------------
import { posix } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

import * as args from './_args.js';
import * as strs from './_strs.js';


// ------------------------------------------------------------------------------------------
export async function stringifyStructures(structures) {
    let output = '';

    for (const key in structures[0]) {
        const value = function () {
            switch (typeof structures[0][key]) {
                case 'string':
                    return `${chalk.yellowBright(`'${structures[0][key]}'`)}`;
                case 'number':
                    return `${chalk.blueBright(structures[0][key])}`;
                default:
                    return `${chalk.yellowBright(structures[0][key])}`;
            }
        }();

        output += `${chalk.greenBright(`'${key}'`)}: ${value}, `;
    }
    return `{{ ${output} }, ... }`;
}


// ------------------------------------------------------------------------------------------
export async function write(dataFolder, filename, structures, groups) {
    const filepath = posix.join(dataFolder, filename);
    const filepathAnsi = `${filepath}.ansi`;
    const filepathText = `${filepath}.log`;

    // Helper: Make teleport command
    function getTpCommand(x, z) {
        return `/tp @s ${x} ~ ${z}`;
    }

    // Convert groups to array and sort
    const sortedGroups = Object.values(groups).sort((a, b) => {
        if (b.ids.length !== a.ids.length) {
            return b.ids.length - a.ids.length;
        }
        return a.distance - b.distance;
    });

    // Generate output
    let output = '';
    for (const group of sortedGroups) {
        let structureCommands = '';

        const outputCount = `(${`${group.ids.length}`.padStart(3, '0')})`;
        const outputDistance = `${group.distance.toFixed(2)}m`.padStart(15, ' ');
        const outputTpCenter = `[${getTpCommand(group.x.toFixed(0), group.z.toFixed(0))}]`.padEnd(35, ' ');

        for (const id of group.ids) {
            const structure = structures[id];
            structureCommands += `(${chalk.yellowBright(structure.structure)} ${getTpCommand(structure.x, structure.z)})  `.padEnd(60, ' ');
        }

        output += `${chalk.blueBright(outputCount)}  ${chalk.greenBright(outputDistance)}  ${outputTpCenter}  ${structureCommands}\n`;
    }

    // Write to file
    fs.writeFileSync(filepathAnsi, output);
    fs.writeFileSync(filepathText, stripAnsi(output));
    strs.log(strs.bullet(`Saved ${chalk.yellowBright(`'${filename}.ansi'`)} and ${chalk.yellowBright(`'.log'`)}`, { level: 1 }));
}

export async function clear(dataFolder, filename) {
    const filepath = posix.join(dataFolder, filename);
    const filepathAnsi = `${filepath}.ansi`;
    const filepathText = `${filepath}.log`;

    fs.removeSync(filepathAnsi);
    fs.removeSync(filepathText);
}
