'use strict';
function ngGridCsvExportPlugin(opts) {
  var self = this;
  self.grid = null;
  self.scope = null;
  self.services = null;

  self.init = function (scope, grid, services) {
    self.grid = grid;
    self.scope = scope;
    self.services = services;
  };

  function downloadFile(fileName, urlData) {

    var aLink = document.createElement('a');
    aLink.download = fileName;
    aLink.href = urlData;

    var event = new MouseEvent('click');
    aLink.dispatchEvent(event);
  }

  self.createCSV = function () {
    downloadFile(self.scope.reportSchema.title + '.csv','data:text/csv;charset=UTF-8,' + encodeURIComponent(self.prepareCSV()));
  };

  self.prepareCSV = function () {

    function csvStringify(str, filter) {
      if (str == null) { // we want to catch anything null-ish, hence just == not ===
        return '';
      }
      if (filter) {
        return filter.filter(str, filter.filterParam);
      }
      if (typeof (str) === 'number') {
        return '' + str;
      }
      if (typeof (str) === 'boolean') {
        return (str ? 'TRUE' : 'FALSE');
      }
      if (typeof (str) === 'string') {
        return str.replace(/"/g, '""');
      }
      return JSON.stringify(str).replace(/"/g, '""');
    }

    function swapLastCommaForNewline(str) {
      var newStr = str.substr(0, str.length - 1);
      return newStr + "\n";
    }

    var csvData = '';
    var filters = {};
    angular.forEach(self.grid.columns, function (col) {
      self.scope.extractFilter(col, filters);
      if (col.visible && (col.width === undefined || col.width === '*' || col.width > 0)) {
        if (col.field.indexOf('.') !== -1) {
          console.error(`Cannot export nested fields such as ${col.field}.  Use $project to simplify.`);
        } else {
          if (!col.colDef?.cellTemplate) {
            csvData += '"' + csvStringify(col.displayName) + '",';
            col.doCSVExport = true;
          } else {
            const templateResp = self.scope.showsContent(col.colDef.cellTemplate, col.field);
            // Third party apps can override showContent and return a function
            if (typeof templateResp === 'function') {
              csvData += '"' + csvStringify(col.displayName) + '",';
              col.doCSVExport = templateResp;
            } else if (templateResp === 'HTML') {
              csvData += '"' + csvStringify(col.displayName) + '",';
              col.doCSVExport = function (value) {
                value = value.replace(/<p>/g, '\n\n');
                value = value.replace(/<\/p>/g, '');
                value = value.replace(/<\s?br\s?\/?>/g, '\n');
                value = value.replace(/<[^>]+>/g, '');
                value = value.replaceAll('&nbsp;', ' ').trim();
                value = value.replaceAll('\n\n \n\n', '\n\n');
                value = value.replaceAll('\n\n\n', '\n\n');
                return value;
              };
            } else if (templateResp) {
              csvData += '"' + csvStringify(col.displayName) + '",';
              col.doCSVExport = true;
            } else {
              col.doCSVExport = false;
            }
          }
        }
      }
    });

    csvData = swapLastCommaForNewline(csvData);

    angular.forEach(self.scope.gridApi.core.getVisibleRows(), function (row) {
      if (row.visible) {
        angular.forEach(self.grid.columns, function (col) {
          if (col.doCSVExport) {
            let value = row.entity[col.field];
            if (typeof col.doCSVExport === 'function') {
              value = col.doCSVExport(value, row.entity, col);
            }
            csvData += '"' + csvStringify(value, filters[col.field]) + '",';
          }
        });
        csvData = swapLastCommaForNewline(csvData);
      }
    });

    return csvData;
  };
}
