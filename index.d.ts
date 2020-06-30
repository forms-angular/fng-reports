export interface IColumnDef {
    name: string;
    field: string;
    displayName: string;
    align?: string;
    cellFilter?: string;
    totalsRow?: string;
}

export interface IReportSchema {
    pipeline: any;
    title?: string;
    drilldown?: string;
    params?: any;
    columnDefs?: IColumnDef[],
    filter?: boolean;
}
