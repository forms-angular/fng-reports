'use strict';

// TODO: Test that ngGridTotalCell stuff works now it has been moved into plugin

describe('Reports', function () {

  var $httpBackend;

  beforeEach(function () {
    angular.mock.module('formsAngular');
  });

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('url handling', function () {

    it('should support report schemas which are fetched from server', function () {
      inject(function (_$httpBackend_, $rootScope, $controller) {
        $httpBackend = _$httpBackend_;
        $httpBackend.whenGET('/api/report/collection/myReport').respond({success: true, schema: {}, report: [
          {'_id': 'F', 'count': 11},
          {'_id': 'M', 'count': 6}
        ]});
        $rootScope.navScope = {};
        var scope = $rootScope.$new();
        var routingService = {
          parsePathFunc: function () {
            return function  () {
              return {modelName: 'collection', reportSchemaName: 'myReport'}
            };
          }
        };
        $controller('AnalysisCtrl', {$scope: scope, routingService: routingService});
        $httpBackend.flush();
        expect(scope.report.length).toBe(2);
      });
    });

  });

});
