// ------------------------------------------------------------------------------------------
import { posix } from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import fs from 'fs-extra';
import { globSync } from 'glob';

import * as args from './_args.js';
import * as strs from './_strs.js';
import * as generate from './generate.js';


// ------------------------------------------------------------------------------------------
async function main() {
    fs.ensureDirSync(args.DATA_PATH);

    strs.log();
    const fileHistoryPath = posix.join(args.DATA_PATH, 'file-history.json');
    let fileHistory = {
        filter: [],
        files: {},
    };

    if (fs.existsSync(fileHistoryPath)) {
        fileHistory = fs.readJSONSync(fileHistoryPath);
    }

    // Check if we need to reprocess all files
    if (args.DEBUG_FORCE) {
        strs.log(strs.bullet('DEBUG_FORCE is enabled! Reprocessing all files...'));
        strs.log();
        fileHistory.files = {};
    } else if (JSON.stringify(fileHistory.filter) != JSON.stringify(args.FILTER)) {
        strs.log(strs.bullet('FILTER has changed! Reprocessing all files...'));
        strs.log();
        fileHistory.files = {};
    }
    fileHistory.filter = args.FILTER;

    // Loop through data files
    for (const dataFolder of globSync('*/', { cwd: args.DATA_PATH })) {
        const filePathCSV = posix.join(args.DATA_PATH, dataFolder, 'data.csv');
        const filePathTxt = posix.join(args.DATA_PATH, dataFolder, 'data.txt');
        let fileData = '';

        if (fs.existsSync(filePathCSV)) {
            fileData = fs.readFileSync(filePathCSV, 'utf8');
        } else if (fs.existsSync(filePathTxt)) {
            fileData = fs.readFileSync(filePathTxt, 'utf8');
        } else {
            strs.log(strs.bullet(chalk.redBright(`Skipping: '${dataFolder}' (no data.csv or data.txt)`), { style: '-X' }));
            continue;
        }

        let dataHash = crypto
            .createHash('sha512')
            .update(fileData)
            .digest('base64');

        if (fileHistory.files[dataFolder] && fileHistory.files[dataFolder] === dataHash) {
            strs.log(strs.bullet(chalk.gray(`Skipping: '${dataFolder}' (already processed)`), { style: '-X' }));
            continue;
        }

        strs.log(strs.bullet(`Processing: ${chalk.yellowBright(`'${dataFolder}'`)}`, { style: '->' }));
        await generate.main(posix.join(args.DATA_PATH, dataFolder), fileData);
        strs.log();

        fileHistory.files[dataFolder] = dataHash;
    }

    // Save file history
    fs.writeJSONSync(fileHistoryPath, fileHistory, { spaces: 4 });
}


// ------------------------------------------------------------------------------------------
strs.log(strs.banner('Running Main'));
await main();
strs.log(2, { doStream: false });
