module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-sanitize/angular-sanitize.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/angular-messages/angular-messages.js',
      'node_modules/jspdf/dist/jspdf.debug.js',
      'node_modules/forms-angular/dist/client/forms-angular.js',
      'node_modules/ng-infinite-scroll/build/ng-infinite-scroll.js',
      'node_modules/angular-ui-bootstrap/dist/ui-bootstrap.js',
      'node_modules/angular-elastic/elastic.js',
      'src/**/*.js',
      'test/specs/**/*.js'
    ],

    autoWatch : true,
    usePolling: true,

    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--headless',
          '--disable-gpu',
          // Without a remote debugging port, Google Chrome exits immediately.
          '--remote-debugging-port=9222',
        ],
      }
    },

    browsers : ['ChromeHeadless'],

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
      'karma-chrome-launcher',
      'karma-junit-reporter'
    ]
  });
};