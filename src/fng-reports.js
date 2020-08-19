'use strict';

formsAngular.controller('AnalysisCtrl', ['$rootScope', '$window', '$filter', '$scope', '$http', '$location', 'cssFrameworkService', 'routingService',
  function ($rootScope, $window, $filter, $scope, $http, $location, cssFrameworkService, routingService) {
    /*jshint newcap: false */
    var firstTime = true,
        pdfPlugIn = new ngGridPdfExportPlugin({inhibitButton: true}),
        csvPlugIn = new ngGridCsvExportPlugin({inhibitButton: true});
    /*jshint newcap: true */

    angular.extend($scope, routingService.parsePathFunc()($location.$$path));

    $scope.reportSchema = {
      columnDefs: []
    };
    $scope.gridOptions = {
      data: 'report',
      columnDefs: $scope.reportSchema.columnDefs,
      showColumnMenu: true,
      enableRowHeaderSelection: false,
      enableFiltering: false,
      showGridFooter: false,
      reallyShowFooter: false,   // this determines whether it is actually displayed or not
      showTotals: true,
      enableColumnResizing: true,
//        enableColumnReordering: true,
//        jqueryUIDraggable: true,
      footerRowHeight: 65,
      multiSelect: false,
      plugins: [pdfPlugIn, csvPlugIn],
      onRegisterApi : function (gridApi) {
        $scope.gridApi = gridApi;
        $scope.gridOptions.plugins.forEach(function(p) {p.init($scope, gridApi.grid, null); });
        gridApi.selection.on.rowSelectionChanged($scope, function afterSelectionChange(rowItem) {
          var url = $scope.reportSchema.drilldown;
          if (url) {
            url = routingService.buildUrl(url.replace(/\|.+?\|/g, function (match) {
              var param = match.slice(1, -1),
                  isParamTest = /\((.+)\)/.exec(param);
              if (isParamTest) {
                var instructions = $scope.reportSchema.params[isParamTest[1]];
                if (instructions) {
                  $scope.param = $scope.record[isParamTest[1]];
                  if (instructions.conversionExpression) {
                    return $scope.$eval(instructions.conversionExpression);
                  }
                } else {
                  return $scope.reportSchema.params[isParamTest[1]].value;
                }
              } else {
                return rowItem.entity[param];
              }
            }));
            window.location = url;
          }
        });
      },
    };
    $scope.report = [];


    if (!$scope.reportSchemaName && $location.$$search.r) {
      switch ($location.$$search.r.slice(0, 1)) {
        case '[' :
          $scope.reportSchema.pipeline = JSON.parse($location.$$search.r);
          break;
        case '{' :
          angular.extend($scope.reportSchema, JSON.parse($location.$$search.r));
          break;
        default :
          throw new Error('No report instructions specified');
      }
    }

    $scope.getTotalVal = function (field, filter) {
      var result = '',
          instructions = _.find($scope.reportSchema.columnDefs, function (col) {
            return col.field === field;
          });

      if (instructions) {
        switch (instructions.totalsRow) {
          case undefined :
            break;
          case '$SUM' :
            var sum = 0;
            for (var j = 0; j < $scope.report.length; j++) {
              sum += $scope.report[j][field];
            }
            result = sum;
            if (filter) {
              result = $filter(filter)(result);
            }
            break;
          default :
            result = instructions.totalsRow;
            break;
        }
      }

      return result;
    };

    $scope.$on('exportToPDF', function () {
      pdfPlugIn.createPDF();
    });

    $scope.$on('exportToCSV', function () {
      csvPlugIn.createCSV();
    });

    var container = document.querySelector('div.report-grow');
    if (container) {
      var margin = container.offsetLeft;  // let's have the same top and bottom margins as we have side margin
      var topOffset = container.offsetTop + margin;
      var header = document.querySelector('div.ui-grid-header');
      var headerHeight = header ? header.clientHeight : 31;
      var availRows = Math.floor(($window.innerHeight - topOffset - headerHeight - margin) / 30);
      angular.element(container).css('height', '' + availRows * 30 + 'px');
    }

    var navScope = $rootScope.navScope;
    navScope.items = [
      {
        fn: pdfPlugIn.createPDF,
        text: 'Save as PDF'
      },
      {
        fn: csvPlugIn.createCSV,
        text: 'Export as CSV'
      }
    ];
    navScope.contextMenu = 'Report';
    $scope.titleWithSubstitutions = $scope.reportSchema.title;

    //  inhibitRefresh can be set by a controller, for example if report data is being provided as part of the URL
    if (!$scope.inhibitRefresh) {
      $scope.refreshQuery = function () {

        function substituteParams(str) {
          return str.replace(/\|.+?\|/g, function (match) {
            var param = match.slice(1, -1);
            var isParamTest = /\((.+)\)/.exec(param);
            return isParamTest ? $scope.reportSchema.params[isParamTest[1]].value : '';
          });
        }

        var apiCall = '/api/report/' + $scope.modelName,
            connector = '?';
        if ($scope.reportSchemaName) {
          apiCall += '/' + $scope.reportSchemaName;
        } else {
          // take params of the URL
          var query = $location.$$url.match(/\?.*/);
          if (query) {
            apiCall += connector + query[0].slice(1);
            connector = '&';
          }
        }

        if ($scope.paramSchema) {
          // we are using the params form
          for (var paramVal in $scope.record) {
            if ($scope.record.hasOwnProperty(paramVal)) {
              var instructions = $scope.reportSchema.params[paramVal];
              if ($scope.record[paramVal] && $scope.record[paramVal] !== '') {
                $scope.param = $scope.record[paramVal];
                if (instructions.conversionExpression) {
                  $scope.param = $scope.$eval(instructions.conversionExpression);
                }
                apiCall += connector + paramVal + '=' + $scope.param;
                connector = '&';
              } else if (instructions.required) {
                // Don't do a round trip if a required field is empty - it will show up red
                return;
              }
            }
          }
        }
        return $http.get(apiCall).then(function (response) {
          var data = response.data;
          if (data.success) {
            $scope.report = data.report;
            $scope.reportSchema = data.schema;
            $scope.reportSchema.title = $scope.reportSchema.title || $scope.modelName;
            $scope.titleWithSubstitutions = substituteParams($scope.reportSchema.title);
            $scope.gridOptions.enableFiltering = !!$scope.reportSchema.filter;
            if (navScope && navScope.items) {
              navScope.items.length = 2;
              if ($scope.reportSchema.menu) {
                $scope.reportSchema.menu.forEach(function(m){
                  navScope.items.push(JSON.parse(substituteParams(JSON.stringify(m))));
                });
              }
            }

            /*
            Generate link data
             */

            if (firstTime) {
              firstTime = false;

              $scope.$watch('reportSchema.columnDefs', function (newValue) {
                var columnTotals = false;
                if (newValue) {
                  for (var i = 0; i < newValue.length; i++) {
                    if (newValue[i].totalsRow) {
                      columnTotals = true;
                    }
                    if (newValue[i].align) {
                      var alignClass = 'fng-' + newValue[i].align;
                      newValue[i].cellClass = newValue[i].cellClass || '';
                      if (newValue[i].cellClass.indexOf(alignClass) === -1) {
                        newValue[i].cellClass = newValue[i].cellClass + ' ' + alignClass;
                      }
                    }
                  }
                  // Auto-upgrade from ng-grid to ui-grid
                  newValue.forEach(function (def) {
                    // Remove px from column widths
                    if (def.width && typeof def.width === 'string' && def.width.indexOf('px') !== -1) {
                      def.width = parseInt(def.width.slice(0, -2));
                    }
                  });
                  $scope.gridOptions.columnDefs = newValue;
                }
                $scope.gridOptions.showTotals = columnTotals;
                $scope.gridOptions.reallyShowFooter = columnTotals;
                $scope.gridOptions.footerRowHeight = 55 + (columnTotals ? 10 : 0);
              }, true);

              if (!$scope.paramSchema && data.schema.params) {
                $scope.paramSchema = [];
                // set up parameters
                $scope.record = {};
                for (var param in data.schema.params) {
                  if (data.schema.params.hasOwnProperty(param)) {
                    var thisPart = data.schema.params[param];
                    // if noInput then this value will be inferred from another parameter
                    if (!thisPart.noInput) {
                      var newLen = $scope.paramSchema.push({
                        name: param,
                        id: 'fp_' + param,
                        label: thisPart.label || $filter('titleCase')(param),
                        type: thisPart.type || 'text',
                        required: true,
                        add: thisPart.add || undefined,
                        size: thisPart.size || (cssFrameworkService.frameWork === 'bs3' ? 'large' : 'medium')
                      });
                      if (thisPart.type === 'select') {
                        // TODO: Remove when select and select2 is modified during the restructure
                        $scope[param + '_Opts'] = thisPart.enum;
                        $scope.paramSchema[newLen - 1].options = param + '_Opts';
                      }
                    }
                    var dateTest = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3})(Z|[+ -]\d{4})$/.exec(thisPart.value);
                    if (dateTest) {
                      thisPart.value = new Date(dateTest[1]);
                    }
                    $scope.record[param] = thisPart.value;
                  }
                }
                $scope.$watch('record', function (newValue, oldValue) {
                  if (oldValue !== newValue) {
                    $scope.refreshQuery();
                  }
                }, true);

              }
            }
          } else {
            console.log(JSON.stringify(data));
            $scope.reportSchema.title = 'Error - see console log';
          }
        }, function (response) {
          console.log(JSON.stringify(response));
          $location.path('/404');
        });
      };

      $scope.refreshQuery();
    }

    $scope.$on('$locationChangeStart', function() {
      delete navScope.contextMenu;
      delete navScope.items;
    });

  }]);
