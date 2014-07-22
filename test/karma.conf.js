module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      "bower_components/angular/angular.js",
      "bower_components/angular-sanitize/angular-sanitize.js",
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/jspdf/dist/jspdf.debug.js',
      'bower_components/forms-angular/dist/forms-angular.js',
      'bower_components/ngInfiniteScroll/build/ng-infinite-scroll.js',
      'bower_components/angular-ui-bootstrap-bower/ui-bootstrap.js',
      'bower_components/angular-elastic/elastic.js',
      'src/**/*.js',
      'test/specs/**/*.js'
    ],

    autoWatch : true,
    usePolling: true,

    browsers : ['PhantomJS'],

    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress'
    // CLI --reporters progress
    reporters: ['progress', 'junit'],

    junitReporter:  {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    },
    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher',
      'karma-junit-reporter'
    ]
  });
};