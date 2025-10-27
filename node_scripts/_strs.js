// ------------------------------------------------------------------------------------------
import { posix } from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import stripAnsi from 'strip-ansi';

import * as args from './_args.js';


// ------------------------------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
export const NAME = pkg.displayName;
export const AUTHOR = pkg.author;
export const VERSION = pkg.version;

const logFilepathAnsi = posix.join(args.OUTPUT_PATH, 'console.ansi');
const logFilepathText = posix.join(args.OUTPUT_PATH, 'console.log');
fs.removeSync(logFilepathAnsi);
fs.removeSync(logFilepathText);
fs.createFileSync(logFilepathAnsi);
fs.createFileSync(logFilepathText);
const logStreamAnsi = fs.createWriteStream(logFilepathAnsi, { flags: 'a' });
const logStreamText = fs.createWriteStream(logFilepathText, { flags: 'a' });


// ------------------------------------------------------------------------------------------
export function log(text = '', { doConsole = true, doStream = true } = {}) {
    if (typeof text === 'number') {
        text = '\n'.repeat(text - 1);
    }

    if (doConsole) {
        console.log(text);
    }
    if (doStream) {
        logStreamAnsi.write(text + '\n');
        logStreamText.write(stripAnsi(text) + '\n');
    }
}


// ------------------------------------------------------------------------------------------
function padding(level) {
    return ' '.repeat(2 * level);
}

export function length(text) {
    return stripAnsi(text).length;
}

export function rule(length = 80) {
    return chalk.white('-'.repeat(length));
}

export function bullet(text, { level = 0, style = '-' } = {}) {
    return `${padding(level)}${style} ${text}`;
}

export function indent(text, { level = 1, right = false } = {}) {
    if (right) { return `${text}${padding(level)}`; }
    else { return `${padding(level)}${text}`; }
}

export function banner(text) {
    const line1Left = indent(`${NAME} - ${AUTHOR}`);
    const line1Right = indent(chalk.gray(``), { right: true });
    const line2Left = indent(chalk.gray(`${text.toUpperCase()}...`));
    const line2Right = indent(chalk.gray(`v${VERSION}`), { right: true });

    const lineRule = rule(length(rule()) - 2);
    const lineBlank = ' '.repeat(length(lineRule));
    const line0Spacing = ' '.repeat(length(lineRule) - length(line1Left) - length(line1Right));
    const line1Spacing = ' '.repeat(length(lineRule) - length(line2Left) - length(line2Right));

    return (
        `+${lineRule}+`
        + '\n' + `¦${lineBlank}¦`
        + '\n' + `¦${line1Left}${line0Spacing}${line1Right}¦`
        + '\n' + `¦${line2Left}${line1Spacing}${line2Right}¦`
        + '\n' + `¦${lineBlank}¦`
        + '\n' + `+${lineRule}+`
    );
}
