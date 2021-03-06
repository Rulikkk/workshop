module powerbi.extensibility.visual {
    import IAxisProperties = powerbi.extensibility.utils.chart.axis.IAxisProperties;
    export interface IMargin {
        top: number;
        bottom: number;
        left: number;
        right: number;
    }

    export interface ISize {
        width: number;
        height: number;
    }

    export interface IItem {
        value: PrimitiveValue;
        columnGroup: DataViewValueColumnGroup;
        tooltipInfo: VisualTooltipDataItem[];
        selectionId: ISelectionId;
        highlighted: boolean;
    }

    export interface IItemGroup {
        categoryColor?: string;
        category: PrimitiveValue;
        items: IItem[];
    }

    export interface VisualData {
        items: IItemGroup[];
        size: ISize;
        defaultColor: string;
        hoverColor: string;
        xAxis: IAxisProperties;
        yAxis: IAxisProperties;
        highlights: boolean;
    }

    export interface IAxisSpace {
        heightOfX: number;
        widthOfY: number;
    }

    export interface ICategory {
        name: string;
        selectionColumn: DataViewCategoryColumn;
        columnGroup: DataViewValueColumnGroup;
        legendColor?: string;
    }

    export interface ICategoryData {
        title: string;
        categories: {
            [categoryName: string]: ICategory;
        };
    }
}
