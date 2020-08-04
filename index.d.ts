// See http://ui-grid.info/docs/#!/api/ui.grid.class:GridOptions.columnDef for details and full list of options
export interface IColumnDef {
    name: string;
    field: string;
    displayName: string;
    align?: string;
    cellFilter?: string;
    totalsRow?: string;
    width?: number | string;
    maxWidth?: number;
    minWidth? : number;
    enableFiltering?: boolean;
    enableSorting?: boolean;
    cellTemplate?: string;
}

export interface IReportSchema {
    pipeline: any;
    title?: string;
    drilldown?: string;
    params?: any;
    columnDefs?: IColumnDef[],
    filter?: boolean;
}
