module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      'client/bower_components/angular/angular.js',
      'client/bower_components/angular-sanitize/angular-sanitize.js',
      'client/bower_components/angular-mocks/angular-mocks.js',
      'client/bower_components/angular-messages/angular-messages.js',
      'client/bower_components/jspdf/dist/jspdf.debug.js',
      'client/bower_components/forms-angular/dist/forms-angular.js',
      'client/bower_components/ngInfiniteScroll/build/ng-infinite-scroll.js',
      'client/bower_components/angular-ui-bootstrap-bower/ui-bootstrap.js',
      'client/bower_components/angular-elastic/elastic.js',
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