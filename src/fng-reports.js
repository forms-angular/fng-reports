'use strict';

formsAngular.controller('AnalysisCtrl', ['$rootScope', '$window', '$q', '$filter', '$scope', '$http', '$location', 'CssFrameworkService', 'RoutingService', 'uiGridConstants',
    function ($rootScope, $window, $q, $filter, $scope, $http, $location, CssFrameworkService, RoutingService, uiGridConstants) {
        /*jshint newcap: false */
        var firstTime = true,
            pdfPlugIn = new ngGridPdfExportPlugin({inhibitButton: true}),
            csvPlugIn = new ngGridCsvExportPlugin({inhibitButton: true});
        /*jshint newcap: true */

        angular.extend($scope, RoutingService.parsePathFunc()($location.$$path));

        $scope.reportSchema = {};
        $scope.gridOptions = {
            enableFiltering: false,
            data: 'report',
            columnDefs: $scope.reportSchema.columnDefs,
            showColumnMenu: true,
            enableRowHeaderSelection: false,
            reallyShowFooter: false,   // this determines whether it is actually displayed or not
            showTotals: true,
            enableColumnResizing: true,
            footerRowHeight: 65,
            multiSelect: false,
            plugins: [pdfPlugIn, csvPlugIn],
            onRegisterApi: function (gridApi) {
                $scope.gridApi = gridApi;
                $scope.gridOptions.plugins.forEach(function (p) {
                    p.init($scope, gridApi.grid, null);
                });
                gridApi.selection.on.rowSelectionChanged($scope, function afterSelectionChange(rowItem, event) {
                    var url = $scope.reportSchema.drilldown;
                    if (url) {
                        if (typeof url === 'string') {
                            // See if we are in an A tag, in which case we don't need to do anything
                            let inATag = event.target.tagName === 'A';
                            let elm = event.target;
                            do {
                                elm = elm.parentElement;
                                inATag = (elm && elm.tagName === 'A');
                            } while (elm && !inATag && elm !== rowItem);
                            if (!inATag) {
                                url = RoutingService.buildUrl(url.replace(/\|.+?\|/g, function (match) {
                                    var param = match.slice(1, -1),
                                        isParamTest = /\((.+)\)/.exec(param);
                                    if (isParamTest) {
                                        var instructions = $scope.reportSchema.params[isParamTest[1]];
                                        if (instructions && $scope.record) {
                                            $scope.param = $scope.record[isParamTest[1]];
                                            if (instructions.conversionExpression) {
                                                return $scope.$eval(instructions.conversionExpression);
                                            } else {
                                                return instructions.value;
                                            }
                                        } else {
                                            if ($scope.reportSchema.params[isParamTest[1]]) {
                                                return $scope.reportSchema.params[isParamTest[1]].value || '';
                                            } else {
                                                console.error('No value for ' + isParamTest[1]);
                                                return 'ERR';
                                            }
                                        }
                                    } else {
                                        return rowItem.entity[param];
                                    }
                                }));
                                window.location = url;
                            }
                        } else {
                            console.error('Was expecting drilldown to be string but it was ' + typeof url + ' (' + url + ')'); // trying to track down Sentry 3037641567
                        }
                    }
                });
            },
            appScopeProvider: {
                http: function ($event, method, url) {
                    /*
                    * This allows us to make an arbitrary http request from a cell template. Example:
                    * <div class="ui-grid-cell-contents">
                    *   <button class="btn btn-small" data-ng-click="grid.appScope.http($event, 'GET', '/apix/queue/cancel/:id')" data-id="{{COL_FIELD}}" data-disable-button="true">
                    *     <span class="glyphicon glyphicon-remove"></span> Cancel
                    *   </button>
                    * </div>
                    * The value of any attribute beginning with data will replace the corresponding :attribute in the url,
                    * so in this case the :id in the url will be replaced by the value of the data-id attribute.
                    */
                    $event.currentTarget.getAttributeNames().forEach(a => {
                        if (a.startsWith('data-')) {
                            url = url.replace(`:${a.slice(5)}`, $event.currentTarget.getAttribute(a));
                        }
                    });
                    let disabledText = $event.currentTarget.getAttribute('data-disable-button');
                    if (disabledText) {
                        $event.currentTarget.setAttribute('disabled', 'disabled');
                        if (disabledText !== 'true') {
                            $event.currentTarget.innerText = disabledText;
                        }
                    }
                    var configObj = {
                        method: method,
                        url: url,
                    };
                    if (['POST', 'PUT', 'PATCH'].indexOf(method) !== -1) {
                        configObj.data = {val: $event.currentTarget.getAttribute('data-data') || {}};
                    }
                    $http(configObj)
                        .then(function (response) {
                            if (response.status !== 200) {
                                $scope.showError(response.statusText, 'Error');
                            }
                        });
                    $event.stopPropagation();
                }
            }
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
                            size: thisPart.size || (CssFrameworkService.frameWork === 'bs3' ? 'large' : 'medium')
                        });
                        if (thisPart.type === 'select') {
                            // TODO: Remove when select and select2 is modified during the restructure
                            $scope[param + '_Opts'] = thisPart.enum;
                            $scope.paramSchema[newLen - 1].options = param + '_Opts';
                        }
                    }
                    var dateTest = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3})(Z|[+ -]\d{4})$/.exec(thisPart.value);
                    if (dateTest) {
                        thisPart.value = new Date(dateTest[0]);
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
        navScope.contextMenuId = 'reportMenu';
        $scope.titleWithSubstitutions = $scope.reportSchema.title;

//  inhibitRefresh can be set by a controller, for example if report data is being provided as part of the URL
        if (!$scope.inhibitRefresh) {

            $scope.refreshQuery = function () {

                function substituteParams(str) {
                    function toTextValue(obj, conversionExpression) {
                        let retVal;
                        if (!(obj instanceof Date)) {
                            if (typeof obj === 'string') {
                                if (obj.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3} \d{4}$/)) {
                                    obj = new Date(obj.replace(' ', '+'));
                                } else if (obj.match(/^\d{13}$/)) {
                                    obj = new Date(parseInt(obj, 10));
                                }
                            }
                        }
                        if (obj instanceof Date) {
                            if (conversionExpression) {
                                $scope.param = obj;
                                retVal = $scope.$eval(conversionExpression);
                            } else {
                                retVal = obj.toISOString();
                            }
                        } else {
                            return obj;
                        }
                        return retVal;
                    }
                    return $q(function (resolve) {
                        let promises = [];
                        str.replace(/\|.+?\|/g, function (match) {
                            var param = match.slice(1, -1);
                            // See if we have a function to run (check for brackets)
                            var hasBrackets = /(.*)\((.+)\)/.exec(param);
                            let promise;
                            if (hasBrackets) {
                                try {
                                    const paramsObj = $scope.reportSchema.params[hasBrackets[2]];
                                    const paramValue = paramsObj.value;
                                    if (hasBrackets.length > 2) {
                                        // We may have a title function to run
                                        if (hasBrackets[1] !== '') {
                                            promise = $http.get(`/api/${hasBrackets[1]}/${paramValue}/list`).then(function (response) {
                                                if (response && response.status === 200 && response.data) {
                                                    return response.data.list;
                                                } else {
                                                    return '';
                                                }
                                            });
                                        }
                                    }
                                    if (promise) {
                                        promises.push(promise);
                                    } else {
                                        promises.push(Promise.resolve(toTextValue(paramValue, paramsObj.conversionExpression)));
                                    }
                                } catch(e) {
                                    console.error(e);
                                    promises.push('Error in fng-reports: ' + e.message);
                                }
                            } else {
                                const paramsObj = $scope.reportSchema.params[param];
                                if (paramsObj) {
                                    promises.push(Promise.resolve(toTextValue(paramsObj.value, paramsObj.conversionExpression)));
                                } else {
                                    console.log('Cannot find param ' + param);
                                    promises.push(Promise.resolve('ERR'));
                                }
                            }
                            return match;
                        });
                        Promise.all(promises).then(function (results) {
                            let index = 0;
                            resolve(str.replace(/\|.+?\|/g, function () {
                                let retVal = results[index];
                                index += 1;
                                return retVal;
                            }));
                        });
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
                        if (firstTime) {
                            firstTime = false;
                            if (data.schema.columnDefs && data.schema.columnDefs.length > 0) {
                                    for (const colDef of data.schema.columnDefs) {
                                        if (colDef.align) {
                                            var alignClass = 'fng-' + colDef.align;
                                            colDef.cellClass = colDef.cellClass || '';
                                            if (colDef.cellClass.indexOf(alignClass) === -1) {
                                                colDef.cellClass = colDef.cellClass + ' ' + alignClass;
                                            }
                                        }
                                        if (colDef.aggregationTypeStr) {
                                            $scope.gridOptions.showColumnFooter = true;
                                            colDef.aggregationType = uiGridConstants.aggregationTypes[colDef.aggregationTypeStr];
                                            if (!colDef.aggregationType) {
                                                colDef.aggregationType = function() {return eval(colDef.aggregationTypeStr);};
                                            }
                                            colDef.aggregationHideLabel = colDef.aggregationTypeStr === 'sum';
                                            colDef.footerCellFilter = colDef.cellFilter;
                                            colDef.footerCellClass = colDef.cellClass;
                                        }
                                        $scope.gridOptions.columnDefs.push(colDef);
                                        // Remove px from column widths
                                        if (colDef.width && typeof colDef.width === 'string' && colDef.width.indexOf('px') !== -1) {
                                            colDef.width = parseInt(colDef.width.slice(0, -2));
                                        }
                                    }
                            } else {
                                // Need to generate columnDefs from the data, including every field (by default the grid gets upset by records with missing data)
                                var allFields = new Set();
                                data.report.forEach(function(row) {
                                    for (var field in row) {
                                        allFields.add(field);
                                    }
                                });
                                data.schema.columnDefs = Array.from(allFields).map(function(field) {
                                    {
                                        const colDef = { name: field };
                                        $scope.gridOptions.columnDefs.push(colDef);
                                        return colDef;
                                    }
                                });
                            }

                            if (!$scope.paramSchema && data.schema.params && $location.$$search.noinput !== '1') {
                                setupParamsForm(data.schema.params);
                            }

                        }
                        $scope.reportSchema.title = $scope.reportSchema.title || $scope.modelName;
                        substituteParams($scope.reportSchema.title)
                            .then(function (str) {
                                $scope.titleWithSubstitutions = str;
                            });
                        $scope.gridOptions.enableFiltering = !!$scope.reportSchema.filter;
                        if (navScope && navScope.items) {
                            navScope.items.length = 2;
                            if ($scope.reportSchema.menu) {
                                $scope.reportSchema.menu.forEach(function (m) {
                                    substituteParams(JSON.stringify(m)).then(function (str) {
                                        navScope.items.push(JSON.parse(str));
                                    });
                                });
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
                        body = `The server could not process the request<br />Details:<br />${error.data}`;
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
            navScope.clearContextMenu();
        });

        // Error handling, stolen quickly from forms-angular record-handler
        $scope.showError = function (error, alertTitle) {
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
            $scope.errorHideTimer = window.setTimeout(function () {
                $scope.dismissError();
                $scope.$digest();
            }, 3500 + (1000 * ($scope.alertTitle + $scope.errorMessage).length / 50));
            $scope.errorVisible = true;
            window.setTimeout(() => {
                $scope.$digest();
            });
        };

        $scope.clearTimeout = function () {
            if ($scope.errorHideTimer) {
                clearTimeout($scope.errorHideTimer);
                delete $scope.errorHideTimer;
            }
        };

        $scope.dismissError = function () {
            $scope.clearTimeout;
            $scope.errorVisible = false;
            delete $scope.errorMessage;
            delete $scope.alertTitle;
        };

        $scope.stickError = function () {
            clearTimeout($scope.errorHideTimer);
        };

    }]);
