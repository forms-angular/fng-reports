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
            onRegisterApi: function (gridApi) {
                $scope.gridApi = gridApi;
                $scope.gridOptions.plugins.forEach(function (p) {
                    p.init($scope, gridApi.grid, null);
                });
                gridApi.selection.on.rowSelectionChanged($scope, function afterSelectionChange(rowItem) {
                    var url = $scope.reportSchema.drilldown;
                    if (url) {
                        if (typeof url === 'string') {
                            url = routingService.buildUrl(url.replace(/\|.+?\|/g, function (match) {
                                var param = match.slice(1, -1),
                                    isParamTest = /\((.+)\)/.exec(param);
                                if (isParamTest) {
                                    var instructions = $scope.reportSchema.params[isParamTest[1]];
                                    if (instructions) {
                                        $scope.param = $scope.record[isParamTest[1]];
                                        if (instructions.conversionExpression) {
                                            return $scope.$eval(instructions.conversionExpression);
                                        } else {
                                            return instructions.value;
                                        }
                                    } else {
                                        return $scope.reportSchema.params[isParamTest[1]].value;
                                    }
                                } else {
                                    return rowItem.entity[param];
                                }
                            }));
                            window.location = url;
                        } else {
                            console.error('Was expecting drilldown to be string but it was ' + typeof url + ' (' + url + ')'); // trying to track down Sentry 3037641567
                        }
                    }
                });
            },
        };
        $scope.report = [];

        function parseAndHandleError(str) {
            try {
                return JSON.parse(str);
            } catch (e) {
                throw new Error(`Invalid JSON ${str}
${e.message}`);
            }
        }

        if (!$scope.reportSchemaName && $location.$$search.r) {
            switch ($location.$$search.r.slice(0, 1)) {
                case '[' :
                    $scope.reportSchema.pipeline = parseAndHandleError($location.$$search.r);
                    break;
                case '{' :
                    angular.extend($scope.reportSchema, parseAndHandleError($location.$$search.r));
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

        $scope.extractFilter = function (col, filters) {
            if (col.cellFilter) {
                var filterName;
                var filterParam;
                var paramPos = col.cellFilter.indexOf(':');
                if (paramPos === -1) {
                    filterName = col.cellFilter;
                } else {
                    filterName = col.cellFilter.slice(0, paramPos).trim();
                    filterParam = col.cellFilter.slice(paramPos + 1, 999).trim();
                    if (filterParam[0] === '\'' || filterParam[0] === '"') {
                        filterParam = filterParam.slice(1, -1);
                    }
                }
                var filter = angular.element(document.body).injector().get('$filter')(filterName.trim());
                filters[col.field] = {filter: filter, filterParam: filterParam};
            }
        };

        function setupParamsForm(params) {
            $scope.paramSchema = [];
            // set up parameters
            $scope.record = {};
            for (var param in params) {
                if (params.hasOwnProperty(param)) {
                    var thisPart = params[param];
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

                var apiCall = '/api/report/' + $scope.modelName;
                var connector = '?';
                var haveUrlParams = false;
                var query = $location.$$url.match(/\?.*/);

                if ($scope.reportSchemaName) {
                    apiCall += '/' + $scope.reportSchemaName;
                } else if (query) {
                    if (firstTime) {
                        // See if we have params in the URL (rather than going through schemaName)
                        $scope.paramSchema = JSON.parse($location.search().r).params;
                        setupParamsForm($scope.paramSchema);
                    }
                    apiCall += connector + query[0].slice(1);
                    connector = '&';
                    haveUrlParams = true;
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
                } else {
                    if (!haveUrlParams && query) {
                        apiCall += connector + query[0].slice(1);
                        connector = '&';
                    }
                }
                return $http.get(apiCall).then(function (response) {
                    if (response && response.data && response.data.success) {
                        var data = response.data;
                        $scope.report = data.report;
                        $scope.reportSchema = data.schema;
                        $scope.reportSchema.title = $scope.reportSchema.title || $scope.modelName;
                        $scope.titleWithSubstitutions = substituteParams($scope.reportSchema.title);
                        $scope.gridOptions.enableFiltering = !!$scope.reportSchema.filter;
                        if (navScope && navScope.items) {
                            navScope.items.length = 2;
                            if ($scope.reportSchema.menu) {
                                $scope.reportSchema.menu.forEach(function (m) {
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
                                setupParamsForm(data.schema.params);
                            }
                        }
                    } else {
                        $scope.showError(JSON.stringify(response.data.error), 'Invalid Response Error');
                        $scope.reportSchema.title = 'Error - see console log';
                    }
                }, function (error) {
                    let body, title;
                    if (error.status === 403) {
                        body = 'You do not have permission to run this report (permission to GET all ' + $scope.modelName + ' records is required)';
                        title = 'Permission denied';
                    } else {
                        body = 'The server could not process the request';
                        title = 'Error';
                    }
                    $scope.showError(body, title);
                });
            };

            $scope.refreshQuery();
        }

        // Check whether a cell template shows the content (in which case we want to output it) or does something funky
        // (for example displays an image)
        $scope.showsContent = function (template, col) {
            if (/{{[\s]*COL_FIELD[\s]*}}/.test(template.replace(/(<([^>]+)>)/gi, ''))) {
                return true;
            } else if (template.indexOf('ng-bind-html="row.entity.' + col) !== -1) {
                return 'HTML';
            }
        };

        $scope.$on('$locationChangeStart', function () {
            delete navScope.contextMenu;
            delete navScope.items;
        });

        // Error handling, stolen quickly from forms-angulat record-handler
        $scope.showError = function(error, alertTitle) {
            $scope.alertTitle = alertTitle ? alertTitle : 'Error!';
            if (typeof error === 'string') {
                $scope.errorMessage = error;
            } else if (!error) {
                $scope.errorMessage = `An error occurred - that's all we got.  Sorry.`;
            } else if (error.message && typeof error.message === 'string') {
                $scope.errorMessage = error.message;
            } else if (error.data && error.data.message) {
                $scope.errorMessage = error.data.message;
            } else {
                try {
                    $scope.errorMessage = JSON.stringify(error);
                } catch (e) {
                    $scope.errorMessage = error;
                }
            }
            $scope.errorHideTimer = window.setTimeout(function() {
                $scope.dismissError();
                $scope.$digest();
            }, 3500 + (1000 * ($scope.alertTitle + $scope.errorMessage).length / 50));
            $scope.errorVisible = true;
            window.setTimeout(() => {
                $scope.$digest();
            });
        };

        $scope.clearTimeout = function() {
            if ($scope.errorHideTimer) {
                clearTimeout($scope.errorHideTimer);
                delete $scope.errorHideTimer;
            }
        };

        $scope.dismissError = function() {
            $scope.clearTimeout;
            $scope.errorVisible = false;
            delete $scope.errorMessage;
            delete $scope.alertTitle;
        };

        $scope.stickError = function() {
            clearTimeout($scope.errorHideTimer);
        };

    }]);
