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

    export interface IItemGroup {
        category: PrimitiveValue;
        items: PrimitiveValue[];
    }

    export interface VisualData {
        items: IItemGroup[];
        size: ISize;
        defaultColor: string;
        hoverColor: string;
        xAxis: IAxisProperties;
        yAxis: IAxisProperties;
    }

    export interface IAxisSpace {
        heightOfX: number;
        widthOfY: number;
    }

}
