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
    var headerInfo = [],
        footers = [],
        data = [],
        filters = {},
        transformers = {};


    angular.forEach(self.grid.columns, function (col) {
      if (col.visible) {
        if (col.field.indexOf('.') !== -1) {
          console.error(`Cannot export nested fields such as ${col.field}.  Use $project to simplify.`);
        } else {
          if (!col.colDef || !col.colDef.cellTemplate) {
            headerInfo.push({d: col.displayName, f: col.field});
          } else {
            const templateResp = self.scope.showsContent(col.colDef.cellTemplate, col.field);
            if (templateResp === 'HTML') {
              headerInfo.push({d: col.displayName, f: col.field});
              transformers[col.field] = function (value) {
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
              headerInfo.push({d: col.displayName, f: col.field});
            }
          }
        }
      }
      if (col.colDef && col.colDef.totalsRow) {
        footers[col.field] = self.grid.getTotalVal(col.field, col.filter).toString();
      }
      self.scope.extractFilter(col, filters);
    });

    angular.forEach(self.scope.gridApi.core.getVisibleRows(), function (row) {
      var output = [];
      if (row.visible) {
        headerInfo.forEach(function(h) {
          var val = row.entity[h.f];
          if (filters[h.d]) {
            val = filters[h.d].filter(val, filters[h.d].filterParam);
          }
          if (transformers[h.f]) {
            val = transformers[h.f](val);
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
      head: [headerInfo.map(h => h.d)],
      body: data
    });

    window.open(doc.output('bloburl'));
  };
}

