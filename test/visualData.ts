/// <reference path="_references.ts"/>

module powerbi.extensibility.visual.test {
    // powerbi.extensibility.utils.test
    import TestDataViewBuilder = powerbi.extensibility.utils.test.dataViewBuilder.TestDataViewBuilder;
    import getRandomNumbers = powerbi.extensibility.utils.test.helpers.getRandomNumbers;

    // powerbi.extensibility.utils.type
    import ValueType = powerbi.extensibility.utils.type.ValueType;

    export class WorkshopVisualData extends TestDataViewBuilder {
        
        public randomCategory: string[] = ["Cat1", "Cat2", "Cat3", "Cat4", "Cat5"];
        public randomValues: number[] = getRandomNumbers(this.randomCategory.length, 1, 10);
        public getDataView(columnNames?: string[]): DataView {
            return this.createCategoricalDataViewBuilder([
                {
                    source: {
                        displayName: "Test category",
                        roles: {
                            category: true,
                            legend: true
                        }
                    },
                    values: this.randomCategory
                }
            ],[
                {
                    source: {
                        displayName: "Test values",
                        isMeasure: true,
                        type: {
                            numeric: true
                        },
                        roles: {
                            measure: true
                        }
                    },
                    values: this.randomValues
                }
            ], columnNames).build();
        }
    }
}