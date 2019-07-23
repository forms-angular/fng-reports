/*! forms-angular 2019-07-23 */
'use strict';

formsAngular.controller('AnalysisCtrl', ['$rootScope', '$filter', '$scope', '$http', '$location', 'cssFrameworkService', 'routingService',
  function ($rootScope, $filter, $scope, $http, $location, cssFrameworkService, routingService) {
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
      showFilter: true,
      showFooter: true,    // always set this to true so it works out the style
      reallyShowFooter: true,   // this determines whether it is actually displayed or not
      showTotals: true,
      enableColumnResize: true,
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
                      return isParamTest ? $scope.reportSchema.params[isParamTest[1]].value : rowItem.entity[param];
                  }));
                  window.location = url;
              }
          })
      },
      footerTemplate: '<div ng-show="gridOptions.reallyShowFooter" class="ngFooterPanel" ng-class="{\'ui-widget-content\': jqueryUITheme, \'ui-corner-bottom\': jqueryUITheme}" ' +
        'ng-style="footerStyle()">' +
        '<div ng-show="gridOptions.showTotals" ng-style="{height: rowHeight+3}">' +
        '<div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ngTotalCell {{col.cellClass}}">' +
        '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
        '<div ng-total-cell></div>' +
        ' </div>' +
        '</div>' +
        '<div class="ngTotalSelectContainer" >' +
        '<div class="ngFooterTotalItems" ng-class="{\'ngNoMultiSelect\': !multiSelect}" >' +
        '<span class="ngLabel">{{i18n.ngTotalItemsLabel}} {{maxRows()}}</span><span ng-show="filterText.length > 0" class="ngLabel">' +
        '({{i18n.ngShowingItemsLabel}} {{totalFilteredItemsLength()}})</span>' +
        '</div>' +
        '<div class="ngFooterSelectedItems" ng-show="multiSelect">' +
        '  <span class="ngLabel">{{i18n.ngSelectedItemsLabel}} {{selectedItems.length}}</span>' +
        '</div>' +
        '</div>' +
        '<div class="ngPagerContainer" style="float: right; margin-top: 10px;" ng-show="enablePaging" ng-class="{\'ngNoMultiSelect\': !multiSelect}">' +
        '<div style="float:left; margin-right: 10px;" class="ngRowCountPicker">' +
        '<span style="float: left; margin-top: 3px;" class="ngLabel">{{i18n.ngPageSizeLabel}}</span>' +
        '<select style="float: left;height: 27px; width: 100px" ng-model="pagingOptions.pageSize" >' +
        '<option ng-repeat="size in pagingOptions.pageSizes">{{size}}</option>' +
        '</select>' +
        '</div>' +
        '<div style="float:left; margin-right: 10px; line-height:25px;" class="ngPagerControl" style="float: left; min-width: 135px;">' +
        '<button class="ngPagerButton" ng-click="pageToFirst()" ng-disabled="cantPageBackward()" title="{{i18n.ngPagerFirstTitle}}">' +
        '<div class="ngPagerFirstTriangle"><div class="ngPagerFirstBar"></div></div></button>' +
        '<button class="ngPagerButton" ng-click="pageBackward()" ng-disabled="cantPageBackward()" title="{{i18n.ngPagerPrevTitle}}">' +
        '<div class="ngPagerFirstTriangle ngPagerPrevTriangle"></div></button>' +
        '<input class="ngPagerCurrent" min="1" max="{{maxPages()}}" type="number" style="width:50px; height: 24px; margin-top: 1px; padding: 0 4px;" ng-model="pagingOptions.currentPage"/>' +
        '<button class="ngPagerButton" ng-click="pageForward()" ng-disabled="cantPageForward()" title="{{i18n.ngPagerNextTitle}}">' +
        '<div class="ngPagerLastTriangle ngPagerNextTriangle"></div></button>' +
        '<button class="ngPagerButton" ng-click="pageToLast()" ng-disabled="cantPageToLast()" title="{{i18n.ngPagerLastTitle}}">' +
        '<div class="ngPagerLastTriangle"><div class="ngPagerLastBar"></div></div></button>' +
        '</div>' +
        '</div>' +
        '</div>'
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

    $scope.refreshQuery = function () {

      var apiCall = '/api/report/' + $scope.modelName,
        connector = '?';
      if ($scope.reportSchemaName) {
        apiCall += '/' + $scope.reportSchemaName;
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
        // take params of the URL
        var query = $location.$$url.match(/\?.*/);
        if (query) {
          apiCall += connector + query[0].slice(1);
        }
      }
      return $http.get(apiCall).then(function (response) {
        var data = response.data;
        if (data.success) {
          $scope.report = data.report;
          $scope.reportSchema = data.schema;
          $scope.reportSchema.title = $scope.reportSchema.title || $scope.modelName;
          $scope.reportSchema.title = $scope.reportSchema.title.replace(/\|.+?\|/g, function (match) {
            var param = match.slice(1, -1);
            var isParamTest = /\((.+)\)/.exec(param);
            return isParamTest ? $scope.reportSchema.params[isParamTest[1]].value : '';
            });

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
                newValue.forEach(function(def) {
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
                    thisPart.value = (moment(dateTest[1]).format('YYYY-MM-DDTHH:mm:ss.SSS')) + 'Z';
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

  }]);




'use strict';
var COL_FIELD = /COL_FIELD/g;
formsAngular.directive('ngTotalCell', ['$compile', '$domUtilityService', function ($compile, domUtilityService) {
  var ngTotalCell = {
    scope: false,
    compile: function () {
      return {
        pre: function ($scope, iElement) {
          var html;
          var cellTemplate,
            filterMatch = $scope.col.cellTemplate.match(/{{COL_FIELD \|(.+)}}/);
          if (filterMatch) {
            cellTemplate = $scope.col.cellTemplate.replace('COL_FIELD |' + filterMatch[1], 'getTotalVal("' + $scope.col.field + '","' + filterMatch[1] + '")');
          } else {
            cellTemplate = $scope.col.cellTemplate.replace(COL_FIELD, 'getTotalVal("' + $scope.col.field + '")');
          }

          if ($scope.col.enableCellEdit) {
            html = $scope.col.cellEditTemplate;
            html = html.replace(DISPLAY_CELL_TEMPLATE, cellTemplate);
            html = html.replace(EDITABLE_CELL_TEMPLATE, $scope.col.editableCellTemplate.replace(COL_FIELD, 'row.entity.' + $scope.col.field));
          } else {
            html = cellTemplate;
          }

          var cellElement = $compile(html)($scope);

          if ($scope.enableCellSelection && cellElement[0].className.indexOf('ngSelectionCell') === -1) {
            cellElement[0].setAttribute('tabindex', 0);
            cellElement.addClass('ngCellElement');
          }

          iElement.append(cellElement);
        },
        post: function ($scope, iElement) {
          if ($scope.enableCellSelection) {
            $scope.domAccessProvider.selectionHandlers($scope, iElement);
          }

          $scope.$on('ngGridEventDigestCell', function () {
            domUtilityService.digest($scope);
          });
        }
      };
    }
  };

  return ngTotalCell;
}]);



'use strict';
function ngGridCsvExportPlugin(opts) {
  var self = this;
  self.grid = null;
  self.scope = null;
  self.services = null;

  self.init = function (scope, grid, services) {

    function doDownloadButton() {
      var fp = angular.element('h1').parent();
      var csvDataLinkPrevious = angular.element('#csv-data-link');
      if (csvDataLinkPrevious != null) {
        csvDataLinkPrevious.remove();
      }
      var csvDataLinkHtml = "<button id=\"csv-data-link\" class=\"btn\"><a href=\"data:text/csv;charset=UTF-8,";
      csvDataLinkHtml += encodeURIComponent(self.prepareCSV());
      csvDataLinkHtml += "\" download=\"Export.csv\">CSV Export</button>";
      fp.append(csvDataLinkHtml);
    }

    self.grid = grid;
    self.scope = scope;
    self.services = services;

    if (!opts.inhibitButton) {
      setTimeout(doDownloadButton, 0);
      scope.catHashKeys = function () {
        var hash = '';
        for (var idx in scope.renderedRows) {
          hash += scope.renderedRows[idx].$$hashKey;
        }
        return hash;
      };
      scope.$watch('catHashKeys()', doDownloadButton);
    }
  };

  self.createCSV = function () {
    window.open('data:text/csv;charset=UTF-8,' + encodeURIComponent(self.prepareCSV()));
  };

  self.prepareCSV = function () {

    function csvStringify(str) {
      if (str == null) { // we want to catch anything null-ish, hence just == not ===
        return '';
      }
      if (typeof(str) === 'number') {
        return '' + str;
      }
      if (typeof(str) === 'boolean') {
        return (str ? 'TRUE' : 'FALSE');
      }
      if (typeof(str) === 'string') {
        return str.replace(/"/g, '""');
      }

      return JSON.stringify(str).replace(/"/g, '""');
    }

    function swapLastCommaForNewline(str) {
      var newStr = str.substr(0, str.length - 1);
      return newStr + "\n";
    }

    var csvData = '';
    angular.forEach(self.grid.columns, function (col) {
      if (col.visible && (col.width === undefined || col.width === '*' || col.width > 0)) {
        csvData += '"' + csvStringify(col.displayName) + '",';
      }
    });

    csvData = swapLastCommaForNewline(csvData);

    angular.forEach(self.grid.rows, function (row) {
      if (row.visible) {
        angular.forEach(self.grid.columns, function (col) {
          if (col.visible) {
            csvData += '"' + csvStringify(row.entity[col.field]) + '",';
          }
        });
        csvData = swapLastCommaForNewline(csvData);
      }
    });

    return csvData;
  };
}

'use strict';
/*
 An early version of this was submitted as a PR to the nggrid project.  This version depends on jspdf having footers
 (which was also submitted as a PR to that project).  If jspdf PR is accepted then we can submit this to nggrid again,
 but that would require putting the totals (ngGridTotalCell.js) into a plugin.
 */

/**
 * FOOTER NO LONGER SUPPORTED
 */

function ngGridPdfExportPlugin(options) {
  var self = this;
  self.grid = null;
  self.scope = null;
  self.services = null;
  self.options = options;

  self.init = function (scope, grid, services) {
    self.grid = grid;
    self.scope = scope;
    self.services = services;

    if (!options.inhibitButton) {
      var fp = grid.$root.find(".ngFooterPanel");
      var pdfDataLinkPrevious = grid.$root.find('.ngFooterPanel .pdf-data-link-span');
      if (pdfDataLinkPrevious != null) {
        pdfDataLinkPrevious.remove();
      }
      var pdfDataLinkHtml = '<button class="pdf-data-link-span">PDF Export</button>';
      fp.append(pdfDataLinkHtml);
      fp.on('click', function () {
        self.createPDF();
      });
    }
  };

  self.createPDF = function () {
    var headers = [],
        headerNames = [],
        footers = [],
        data = [];

    angular.forEach(self.grid.columns, function (col) {
      if (col.visible) {
        headers.push(col.displayName);
        headerNames.push(col.field);
      }
      if (col.colDef.totalsRow) {
        footers[col.field] = self.grid.getTotalVal(col.field, col.filter).toString();
      }
    });

    angular.forEach(self.grid.rows, function (row) {
      var output = [];
      if (row.visible) {
        headerNames.forEach(function(h) {
          output.push(row.entity[h]);
        });
        data.push(output);
      }
    });

    // var doc = new jsPDF('landscape', 'mm', 'a4');
    var doc = new jsPDF('landscape', 'mm', 'a4');
    doc.autoTable({
      head: [headers],
      body: data
    });

    window.open(doc.output('bloburl'));
  };
}


// /** ====================================================================
//  * jsPDF Cell plugin
//  * Copyright (c) 2013 Youssef Beddad, youssef.beddad@gmail.com
//  *               2013 Eduardo Menezes de Morais, eduardo.morais@usp.br
//  *               2013 Lee Driscoll, https://github.com/lsdriscoll
//  *               2014 Juan Pablo Gaviria, https://github.com/juanpgaviria
//  *               2014 James Hall, james@parall.ax
//  *
//  * Permission is hereby granted, free of charge, to any person obtaining
//  * a copy of this software and associated documentation files (the
//  * "Software"), to deal in the Software without restriction, including
//  * without limitation the rights to use, copy, modify, merge, publish,
//  * distribute, sublicense, and/or sell copies of the Software, and to
//  * permit persons to whom the Software is furnished to do so, subject to
//  * the following conditions:
//  *
//  * The above copyright notice and this permission notice shall be
//  * included in all copies or substantial portions of the Software.
//  *
//  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//  * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//  * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
//  * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//  * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
//  * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//  * ====================================================================
//  */
//
// (function (jsPDFAPI) {
//   'use strict';
//   /*jslint browser:true */
//   /*global document: false, jsPDF */
//
//   var fontName,
//     fontSize,
//     fontStyle,
//     padding = 3,
//     margin = 13,
//     headerFunction,
//     lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined },
//     pages = 1,
//     setLastCellPosition = function (x, y, w, h, ln) {
//       lastCellPos = { 'x': x, 'y': y, 'w': w, 'h': h, 'ln': ln };
//     },
//     getLastCellPosition = function () {
//       return lastCellPos;
//     };
//
//   jsPDFAPI.setHeaderFunction = function (func) {
//     headerFunction = func;
//   };
//
//   jsPDFAPI.getTextDimensions = function (txt) {
//     fontName = this.internal.getFont().fontName;
//     fontSize = this.table_font_size || this.internal.getFontSize();
//     fontStyle = this.internal.getFont().fontStyle;
//     // 1 pixel = 0.264583 mm and 1 mm = 72/25.4 point
//     var px2pt = 0.264583 * 72 / 25.4,
//       dimensions,
//       text;
//
//     text = document.createElement('font');
//     text.id = "jsPDFCell";
//     text.style.fontStyle = fontStyle;
//     text.style.fontName = fontName;
//     text.style.fontSize = fontSize + 'pt';
//     text.innerText = txt;
//
//     document.body.appendChild(text);
//
//     dimensions = { w: (text.offsetWidth + 1) * px2pt, h: (text.offsetHeight + 1) * px2pt};
//
//     document.body.removeChild(text);
//
//     return dimensions;
//   };
//
//   jsPDFAPI.cellAddPage = function () {
//     this.addPage();
//
//     setLastCellPosition(this.margins.left, this.margins.top, undefined, undefined);
//     //setLastCellPosition(undefined, undefined, undefined, undefined, undefined);
//     pages += 1;
//   };
//
//   jsPDFAPI.cellInitialize = function () {
//     lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined };
//     pages = 1;
//   };
//
//   jsPDFAPI.cell = function (x, y, w, h, txt, ln, align) {
//     var curCell = getLastCellPosition();
//
//     // If this is not the first cell, we must change its position
//     if (curCell.ln !== undefined) {
//       if (curCell.ln === ln) {
//         //Same line
//         x = curCell.x + curCell.w;
//         y = curCell.y;
//       } else {
//         //New line
//         if ((curCell.y + curCell.h + h + margin) >= this.internal.pageSize.height - this.margins.bottom) {
//           this.cellAddPage();
//           if (this.printHeaders && this.tableHeaderRow) {
//             this.printHeaderRow(ln, true);
//           }
//         }
//         //We ignore the passed y: the lines may have diferent heights
//         y = (getLastCellPosition().y + getLastCellPosition().h);
//
//       }
//     }
//
//     if (txt[0] !== undefined) {
//       if (this.printingHeaderRow) {
//         this.rect(x, y, w, h, 'FD');
//       } else {
//         this.rect(x, y, w, h);
//       }
//       if (align === 'right') {
//         var textSize;
//         if (txt instanceof Array) {
//           for (var i = 0; i < txt.length; i++) {
//             var currentLine = txt[i];
//             textSize = this.getStringUnitWidth(currentLine) * this.internal.getFontSize() / (72 / 25.6);
//             this.text(currentLine, x + w - textSize - padding, y + this.internal.getLineHeight() * (i + 1));
//           }
//         } else {
//           textSize = this.getStringUnitWidth(txt) * this.internal.getFontSize() / (72 / 25.6);
//           this.text(txt, x + w - textSize - padding, y + this.internal.getLineHeight());
//         }
//       } else {
//         this.text(txt, x + padding, y + this.internal.getLineHeight());
//       }
//     }
//     setLastCellPosition(x, y, w, h, ln);
//     return this;
//   };
//
//   /**
//    * Return an array containing all of the owned keys of an Object
//    * @type {Function}
//    * @return {String[]} of Object keys
//    */
//   jsPDFAPI.getKeys = (typeof Object.keys === 'function')
//     ? function (object) {
//     if (!object) {
//       return [];
//     }
//     return Object.keys(object);
//   }
//     : function (object) {
//     var keys = [],
//       property;
//
//     for (property in object) {
//       if (object.hasOwnProperty(property)) {
//         keys.push(property);
//       }
//     }
//
//     return keys;
//   };
//
//   /**
//    * Return the maximum value from an array
//    * @param array
//    * @param comparisonFn
//    * @returns {*}
//    */
//   jsPDFAPI.arrayMax = function (array, comparisonFn) {
//     var max = array[0],
//       i,
//       ln,
//       item;
//
//     for (i = 0, ln = array.length; i < ln; i += 1) {
//       item = array[i];
//
//       if (comparisonFn) {
//         if (comparisonFn(max, item) === -1) {
//           max = item;
//         }
//       } else {
//         if (item > max) {
//           max = item;
//         }
//       }
//     }
//
//     return max;
//   };
//
//   /**
//    * Create a table from a set of data.
//    * @param {Integer} [x] : left-position for top-left corner of table
//    * @param {Integer} [y] top-position for top-left corner of table
//    * @param {Object[]} [data] As array of objects containing key-value pairs corresponding to a row of data.
//    * @param {Object} [config.headers] String[] Omit or null to auto-generate headers at a performance cost
//    * @param {Object} [config.footers] Object containing key-value pairs.  Omit or null if not required
//    * @param {Object} [config.printHeaders] True to print column headers at the top of every page
//    * @param {Object} [config.autoSize] True to dynamically set the column widths to match the widest cell value
//    * @param {Object} [config.margins] margin values for left, top, bottom, and width
//    * @param {Object} [config.fontSize] Integer fontSize to use (optional)
//    */
//
//   jsPDFAPI.table = function (x, y, data, config) {
//     if (!data) {
//       throw 'No data for PDF table';
//     }
//
//     var headerNames = [],
//       headerPrompts = [],
//       header,
//       i,
//       ln,
//       cln,
//       columnMatrix = {},
//       columnWidths = {},
//       columnData,
//       column,
//       columnMinWidths = [],
//       columnAligns = [],
//       j,
//       tableHeaderConfigs = [],
//       model,
//       jln,
//       func,
//
//     //set up defaults. If a value is provided in config, defaults will be overwritten:
//       autoSize = false,
//       printHeaders = true,
//       fontSize = 12,
//       headers = null,
//       footers = null,
//       margins = {left: 0, top: 0, bottom: 0, width: this.internal.pageSize.width};
//
//     if (config) {
//       //override config defaults if the user has specified non-default behavior:
//       if (config.autoSize === true) {
//         autoSize = true;
//       }
//       if (config.printHeaders === false) {
//         printHeaders = false;
//       }
//       if (config.fontSize) {
//         fontSize = config.fontSize;
//       }
//       if (config.margins) {
//         margins = config.margins;
//       }
//       if (config.headers) {
//         headers = config.headers;
//       }
//       if (config.footers) {
//         footers = config.footers;
//       }
//     }
//
//     /**
//      * @property {Number} lnMod
//      * Keep track of the current line number modifier used when creating cells
//      */
//     this.lnMod = 0;
//     lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined },
//       pages = 1;
//
//     this.printHeaders = printHeaders;
//     this.margins = margins;
//     this.setFontSize(fontSize);
//     this.table_font_size = fontSize;
//
//     // Set header values
//     if (headers === undefined || (headers === null)) {
//       // No headers defined so we derive from data
//       headerNames = this.getKeys(data[0]);
//
//     } else if (headers[0] && (typeof headers[0] !== 'string')) {
// //            var px2pt = 0.264583 * 72 / 25.4;
//       var constant = 1.5; // arrived at by trial and error
//
//       // Split header configs into names and prompts
//       for (i = 0, ln = headers.length; i < ln; i += 1) {
//         header = headers[i];
//         headerNames.push(header.name);
//         headerPrompts.push(header.prompt);
//         columnWidths[header.name] = header.width * constant;
//         columnAligns[header.name] = header.align;
//       }
//
//     } else {
//       headerNames = headers;
//     }
//     if (autoSize) {
//       // Create a matrix of columns e.g., {column_title: [row1_Record, row2_Record]}
//       func = function (rec) {
//         return rec[header];
//       };
//
//       for (i = 0, ln = headerNames.length; i < ln; i += 1) {
//         header = headerNames[i];
//
//         columnMatrix[header] = data.map(
//           func
//         );
//
//         // get header width
//         columnMinWidths.push(this.getTextDimensions(headerPrompts[i] || header).w);
//         column = columnMatrix[header];
//
//         // get cell widths
//         for (j = 0, cln = column.length; j < cln; j += 1) {
//           columnData = column[j];
//           columnMinWidths.push(this.getTextDimensions(columnData).w);
//         }
//
//         // get footer width
//         if (footers) {
//           columnMinWidths.push(this.getTextDimensions(footers[i]).w);
//         }
//
//         // get final column width
//         columnWidths[header] = jsPDFAPI.arrayMax(columnMinWidths);
//       }
//     }
//
//     // -- Construct the table
//
//     if (printHeaders) {
//       var lineHeight = this.calculateLineHeight(headerNames, columnWidths, headerPrompts.length ? headerPrompts : headerNames);
//
//       // Construct the header row
//       for (i = 0, ln = headerNames.length; i < ln; i += 1) {
//         header = headerNames[i];
//         tableHeaderConfigs.push([x, y, columnWidths[header], lineHeight, String(headerPrompts.length ? headerPrompts[i] : header), 0, columnAligns[header]]);
//       }
//
//       // Store the table header config
//       this.setTableHeaderRow(tableHeaderConfigs);
//
//       // Print the header for the start of the table
//       this.printHeaderRow(1, false);
//     }
//
//     // Construct the data rows
//     for (i = 0, ln = data.length; i < ln; i += 1) {
//       var lineHeight;
//       model = data[i];
//       lineHeight = this.calculateLineHeight(headerNames, columnWidths, model);
//
//       for (j = 0, jln = headerNames.length; j < jln; j += 1) {
//         header = headerNames[j];
//         this.cell(x, y, columnWidths[header], lineHeight, model[header], i + 2, columnAligns[header]);
//       }
//     }
//
//     if (footers) {
//       // Construct the header row
//       for (var fi = 0; fi < headerNames.length; fi++) {
//         header = headerNames[fi];
//         tableHeaderConfigs[fi][4] = footers[header] || ' ';
//       }
//
//       // Print the header for the start of the table
//       this.printHeaderRow(i + 2, false);
//     }
//     this.table_x = x;
//     this.table_y = y;
//     return this;
//   };
//   /**
//    * Calculate the height for containing the highest column
//    * @param {String[]} headerNames is the header, used as keys to the data
//    * @param {Integer[]} columnWidths is size of each column
//    * @param {Object[]} model is the line of data we want to calculate the height of
//    */
//   jsPDFAPI.calculateLineHeight = function (headerNames, columnWidths, model) {
//     var header, lineHeight = 0;
//     for (var j = 0; j < headerNames.length; j++) {
//       header = headerNames[j];
//       model[header] = this.splitTextToSize(String(model[header]), columnWidths[header] - padding);
//       var h = this.internal.getLineHeight() * model[header].length + padding;
//       if (h > lineHeight)
//         lineHeight = h;
//     }
//     return lineHeight;
//   };
//
//   /**
//    * Store the config for outputting a table header
//    * @param {Object[]} config
//    * An array of cell configs that would define a header row: Each config matches the config used by jsPDFAPI.cell
//    * except the ln parameter is excluded
//    */
//   jsPDFAPI.setTableHeaderRow = function (config) {
//     this.tableHeaderRow = config;
//   };
//
//   /**
//    * Output the store header row
//    * @param lineNumber The line number to output the header at
//    */
//   jsPDFAPI.printHeaderRow = function (lineNumber, new_page) {
//     if (!this.tableHeaderRow) {
//       throw 'Property tableHeaderRow does not exist.';
//     }
//
//     var tableHeaderCell,
//       tmpArray,
//       i,
//       ln;
//
//     this.printingHeaderRow = true;
//     if (headerFunction !== undefined) {
//       var position = headerFunction(this, pages);
//       setLastCellPosition(position[0], position[1], position[2], position[3], -1);
//     }
//     this.setFontStyle('bold');
//     var tempHeaderConf = [];
//     for (i = 0, ln = this.tableHeaderRow.length; i < ln; i += 1) {
//       this.setFillColor(200, 200, 200);
//
//       tableHeaderCell = this.tableHeaderRow[i];
//       if (new_page) {
//         tableHeaderCell[1] = this.margins.top;
//         tempHeaderConf.push(tableHeaderCell);
//       }
//       tmpArray = [].concat(tableHeaderCell);
//       tmpArray[5] = lineNumber;
//       this.cell.apply(this, tmpArray);
//     }
//     if (tempHeaderConf.length > 0) {
//       this.setTableHeaderRow(tempHeaderConf);
//     }
//     this.setFontStyle('normal');
//     this.printingHeaderRow = false;
//   };
//
// })(jsPDF.API);
//
