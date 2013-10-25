module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! \n<%= pkg.name %>\n@version: <%= pkg.version %>\n@date: <%= grunt.template.today("dd-mm-yyyy") %>\n@author: <%= pkg.author %>\n\n<%= pkg.description %>\n*/\n',
        uglify: {
            options: {
                preserveComments: 'false',
                banner: '<%= banner %>'
            },
            my_target: {
                files: {
                'plugin.min.js' : ['plugin.js']
                }
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', 'uglify');
};