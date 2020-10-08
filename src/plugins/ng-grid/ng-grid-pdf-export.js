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
        data = [],
        filters = {};

    angular.forEach(self.grid.columns, function (col, index) {
      if (col.visible && !col.colDef.cellTemplate) {
        headers.push(col.displayName);
        headerNames.push(col.field);
      }
      if (col.colDef.totalsRow) {
        footers[col.field] = self.grid.getTotalVal(col.field, col.filter).toString();
      }
      self.scope.extractFilter(col, filters);
    });

    angular.forEach(self.scope.gridApi.core.getVisibleRows(), function (row) {
      var output = [];
      if (row.visible) {
        headerNames.forEach(function(h) {
          var val = row.entity[h];
          if (filters[h]) {
            val = filters[h].filter(val, filters[h].filterParam);
          }
          output.push(val);
        });
        data.push(output);
      }
    });

    // var doc = new jsPDF('landscape', 'mm', 'a4');
    var doc = new jspdf.jsPDF('landscape', 'mm', 'a4');
    doc.autoTable({
      head: [headers],
      body: data
    });

    window.open(doc.output('bloburl'));
  };
}

