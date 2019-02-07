'use strict';

const recursivePathToTests = 'test/**/*.ts';
const srcRecursivePath = '.tmp/drop/visual.js';
const srcCssRecursivePath = '.tmp/drop/visual.css';
const srcOriginalRecursivePath = 'src/**/*.ts';
const coverageFolder = 'coverage';

module.exports = (config) => {
    config.set({
        browsers: ['Chrome'],
        colors: true,
        frameworks: ['jasmine'],
        reporters: [
            'progress',
            'coverage',
            'karma-remap-istanbul'
        ],
        singleRun: false,
        files: [
            srcCssRecursivePath,
            srcRecursivePath,
            'node_modules/lodash/lodash.min.js',
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/jasmine-jquery/lib/jasmine-jquery.js',
            'node_modules/powerbi-visuals-utils-testutils/lib/index.js',
            recursivePathToTests,
            {
                pattern: srcOriginalRecursivePath,
                included: false,
                served: true
            }
        ],
        preprocessors: {
            [recursivePathToTests]: ['typescript'],
            [srcRecursivePath]: ['sourcemap', 'coverage']
        },
        typescriptPreprocessor: {
            options: {
                sourceMap: false,
                target: 'ES5',
                removeComments: false,
                concatenateOutput: false
            }
        },
        coverageReporter: {
            dir: coverageFolder,
            reporters: [
                { type: 'html' },
                { type: 'lcov' }
            ]
        },
        remapIstanbulReporter: {
            reports: {
                lcovonly: coverageFolder + '/lcov.info',
                html: coverageFolder,
                'text-summary': null
            }
        }
    });
};