// ------------------------------------------------------------------------------------------
import { posix } from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';


// ------------------------------------------------------------------------------------------
const ARGS = yargs(hideBin(process.argv))
    .usage(`${chalk.yellowBright('npm')} run main ${chalk.gray('--env')} ${chalk.blueBright(`'./path/to/.env'`)}`)

    .boolean('help')
    .describe('help', chalk.yellowBright('Show this help message'))

    .string('env')
    .describe('env', chalk.blueBright('.env filepath to load'))

    .demandOption(['env'])
    .hide('version')
    .parse();


// ------------------------------------------------------------------------------------------
dotenv.config({ path: ARGS.env });

export const OUTPUT_PATH = (process.env.OUTPUT_PATH || posix.resolve('./node_outputs', ARGS.env));
export const DATA_PATH = (process.env.DATA_PATH || posix.resolve('./data'));
export const CLUSTER_RADIUS = (process.env.CLUSTER_RADIUS || 128);
export const FILTER = JSON.parse(process.env.FILTER || '["swamp_hut"]');

export const DEBUG_FORCE = (process.env.DEBUG_FORCE || 'false').toLowerCase() === 'true';
export const DEBUG_PLOT = (process.env.DEBUG_PLOT || 'false').toLowerCase() === 'true';
export const DEBUG_DBSCAN = (process.env.DEBUG_DBSCAN || 'false').toLowerCase() === 'true';
