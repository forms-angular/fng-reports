# fng-reports

Plugin for forms-angular that adds Reporting capability, with grid output, totals, drill-downs 
(to other, more specific, reports or to the form that the data can be amended in), export to PDF and CSV

## Usage

    npm install fng-reports

To get all the dependencies at the top level of your node_modules run

    npm dedupe
    
Add the following lines to your index.html (or equivalent) file

    <link rel="stylesheet" href="angular-ui-grid/ui-grid.css" />
    
    <script src="angular-ui-grid/ui-grid.js"></script>
    <script src="jspdf/dist/jspdf.min.js"></script>
    <script src="jspdf/dist/jspdf.min.js"></script>
    <script src="fng-reports/dist/fng-reports.js"></script>
    
The full documentation, which includes examples, is at www.forms-angular.org/#/plugins 
