module.exports = function (grunt) {
    "use strict";

    var commonFiles = "src/common/*.ts";
    var serviceFiles = ["src/service/**/*.ts", commonFiles];
    var adminFiles = ["src/admin/**/*.ts", commonFiles];
    var html = "src/static/**";

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            service: {
                files: serviceFiles,
                tasks: ['ts:service']
            },

            client: {
                files: adminFiles,
                tasks: ['ts:admin']
            },

            static: {
                files: html,
                tasks: ['copy']
            }
        },

        ts: {
            options: {
                sourceMap: false,
                comments: false,               // same as !removeComments. [true | false (default)]
                target: 'es5',                 // target javascript language. [es3 (default) | es5]
                declaration: false,            // generate a declaration .d.ts file for every output js file. [true | false (default)]
                fast: 'always'
            },

            service: {
                src: serviceFiles,
                outDir: 'tribeca',
                options: {
                    module: 'commonjs'
                }
            },

            admin: {
                src: adminFiles,
                outDir: 'tribeca/service/admin/js',
                options: {
                    module: 'amd'
                }
            }
        },

        copy: {
            main: {
                expand: true,
                cwd: "src/static",
                src: "**",
                dest: "tribeca/service/admin"
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask("default", ["ts", "copy", "watch"]);
    grunt.registerTask("compile", ["ts", "copy"])
};
