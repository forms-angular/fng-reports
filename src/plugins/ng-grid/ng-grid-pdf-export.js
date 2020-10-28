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
      if (col.visible && (!col.colDef.cellTemplate || self.scope.showsContent(col.colDef.cellTemplate))) {
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
          if (typeof val === 'string') {
            // chars > 255 cause BOM characters - see https://reallycare.freshdesk.com/a/tickets/2370
            // first replace the predictable chars
            val = val.replace(/\u2019/g,'\'');
            val = val.replace(/\u2018/g,'\'');
            val = val.replace(/\u201c/g,'"');
            val = val.replace(/\u201d/g,'"');

            // Then strip out anything left over 255
            val = val.replace(/[^\x00-\xFF]/g, '');
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

