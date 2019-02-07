/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    "use strict";
    import createAxis = powerbi.extensibility.utils.chart.axis.createAxis;
    import IAxisProperties = powerbi.extensibility.utils.chart.axis.IAxisProperties;
    import svg = powerbi.extensibility.utils.svg;
    import CssConstants = svg.CssConstants;
    import legend = powerbi.extensibility.utils.chart.legend;
    import DataRoleHelper = powerbi.extensibility.utils.dataview.DataRoleHelper;
    import IColorPalette = powerbi.extensibility.IColorPalette;
    import ColorHelper = powerbi.extensibility.utils.color.ColorHelper;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import LegendBehavior = powerbi.extensibility.utils.chart.legend.LegendBehavior;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;

    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;

    module Selectors {
        export const MainSvg = CssConstants.createClassAndSelector("main-svg");
        export const BarGroup = CssConstants.createClassAndSelector("bar-group");
        export const Bar = CssConstants.createClassAndSelector("bar");
        export const LegendItem = CssConstants.createClassAndSelector("legendItem");
        export const LegndTitle = CssConstants.createClassAndSelector("legendTitle");
    }

    export class Visual implements IVisual {
        private settings: VisualSettings; // settings field might already be there, so don't declare it twice
        private mainSvgElement: d3.Selection<SVGElement>;
        private visualSvgGroup: d3.Selection<SVGElement>;

        private xAxisGroup: d3.Selection<SVGElement>;
        private yAxisGroup: d3.Selection<SVGElement>;

        private legend: legend.ILegend;
        private interactivityServices: IInteractivityService;
        private legendBehavior: LegendBehavior;

        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private host: IVisualHost;

        private clearCatcher: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;

        constructor(options: VisualConstructorOptions) {
            // Create d3 selection from main HTML element
            const mainElement = d3.select(options.element);
            // Append SVG element to it. This SVG will contain our visual
            this.mainSvgElement = mainElement
                .append("svg")
                .classed(Selectors.MainSvg.className, true);

            this.clearCatcher = appendClearCatcher(this.mainSvgElement);

            // Append an svg group that will contain our visual
            this.visualSvgGroup = this.mainSvgElement.append("g");

            this.xAxisGroup = this.mainSvgElement.append("g");
            this.xAxisGroup.classed("xAxis", true);
            //axis groups
            this.yAxisGroup = this.mainSvgElement.append("g");
            this.yAxisGroup.classed("yAxis", true);

            this.interactivityServices = createInteractivityService(options.host);

            // legend behavior
            this.legendBehavior = new LegendBehavior();
            // Initialize legend
            this.legend = legend.createLegend(
                options.element,
                false,
                this.interactivityServices,
                false,
                legend.LegendPosition.Top,
                this.legendBehavior
            );

            this.host = options.host;

            // tooltips
            this.tooltipServiceWrapper = createTooltipServiceWrapper(
                this.host.tooltipService,
                options.element
            );

            // selection manager
            this.selectionManager = this.host.createSelectionManager();
        }

        private static findIndex<T>(array: T[], predicate: (value: T) => boolean): number {
            for (let i = 0; i < array.length; i++) {
                if (predicate(array[i])) {
                    return i;
                }
            }

            return -1;
        }

        private static getCategories(dataView: DataView): ICategoryData {
            const data: ICategoryData = {
                title: null,
                categories: {}
            };

            // Get legend's metadata column index
            const legendIndex = Visual.findIndex(dataView.metadata.columns, col =>
                DataRoleHelper.hasRole(col, "legend")
            );

            if (legendIndex !== -1) {
                data.title = dataView.metadata.columns[legendIndex].displayName;
                console.log(`Legend title = ${data.title}`);

                const groupedValues = dataView.categorical.values.grouped();
                console.log(groupedValues);

                groupedValues.forEach((group, i) => {
                    const column: DataViewCategoryColumn = {
                        identity: [group.identity],
                        source: {
                            displayName: null,
                            queryName: dataView.metadata.columns[legendIndex].queryName
                        },
                        values: null
                    };

                    const category: ICategory = {
                        name: group.name as string,
                        selectionColumn: column,
                        columnGroup: group
                    };

                    data.categories[category.name] = category;
                });
            }

            return data;
        }

        private static transform(
            dataView: DataView,
            categoryData: ICategoryData,
            host: IVisualHost
        ): IItemGroup[] {
            if (
                !dataView.categorical &&
                !dataView.categorical.categories &&
                !dataView.categorical.categories.length &&
                !dataView.categorical.categories[0].values &&
                !dataView.categorical.values &&
                !dataView.categorical.values.length
            ) {
                return;
            }

            const valuesObject = dataView.categorical.values.filter(column =>
                DataRoleHelper.hasRoleInValueColumn(column, "measure")
            );
            const tooltipsObject = dataView.categorical.values.filter(column =>
                DataRoleHelper.hasRoleInValueColumn(column, "tooltips")
            );
            const categoryMetadata = dataView.metadata.columns.filter(column =>
                DataRoleHelper.hasRole(column, "category")
            )[0];
            const valuesMetadata = dataView.metadata.columns.filter(column =>
                DataRoleHelper.hasRole(column, "measure")
            )[0];
            const legendMetadata = dataView.metadata.columns.filter(column =>
                DataRoleHelper.hasRole(column, "legend")
            )[0];

            const categoryName = categoryMetadata.displayName;
            const valueName = valuesMetadata.displayName;
            const legendName = legendMetadata.displayName;

            const tooltipsFormattingOptions = tooltipsObject.map(object => {
                return {
                    object,
                    formatter: valueFormatter.create({
                        format: valueFormatter.getFormatStringByColumn(object.source)
                    })
                };
            });

            const tooltipsObjectsGroups = d3
                .nest<{ object: DataViewValueColumn }>()
                .key(data => data.object.source.groupName as string)
                .map(tooltipsFormattingOptions, d3.map);

            const values = dataView.categorical.values;

            const categories = dataView.categorical.categories[0].values;

            const categoryFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(
                    dataView.categorical.categories[0].source
                )
            });

            const measuresFormattersOptions = valuesObject.map(object => {
                return {
                    object,
                    formatter: valueFormatter.create({
                        format: valueFormatter.getFormatStringByColumn(object.source)
                    })
                };
            });

            const measuresObjectsGroups = d3
                .nest<{ object: DataViewValueColumn }>()
                .key(data => data.object.source.groupName as string)
                .map(measuresFormattersOptions, d3.map);

            const items = categories.map<IItemGroup>((category, index) => {
                return {
                    category: category,
                    items: valuesObject.map(valueObject => {
                        const value = valueObject.values[index];
                        const groupName = valueObject.source.groupName as string;
                        const tooltipsColumns = tooltipsObjectsGroups.has(groupName)
                            ? tooltipsObjectsGroups
                                  .get(groupName)
                                  .map((data: { object: DataViewValueColumn; formatter: any }) => {
                                      return {
                                          displayName: data.object.source.displayName,
                                          value: data.formatter.format(data.object.values[index])
                                      };
                                  })
                            : [];

                        const formattedValue = measuresObjectsGroups.has(groupName)
                            ? measuresObjectsGroups
                                  .get(groupName)
                                  .map((data: { object: DataViewValueColumn; formatter: any }) => {
                                      return data.formatter.format(data.object.values[index]);
                                  })
                            : [];

                        const selectionId = host
                            .createSelectionIdBuilder()
                            .withCategory(dataView.categorical.categories[0], index)
                            .withCategory(categoryData.categories[groupName].selectionColumn, 0)
                            .createSelectionId();

                        return {
                            selectionId: selectionId,
                            value: value,
                            columnGroup: categoryData.categories[groupName]
                                ? categoryData.categories[groupName].columnGroup
                                : null,
                            tooltipInfo: [
                                {
                                    displayName: categoryName,
                                    value: category.toString()
                                },
                                {
                                    displayName: valueName,
                                    value: formattedValue[0]
                                },
                                {
                                    displayName: legendName,
                                    value: groupName
                                }
                            ].concat(tooltipsColumns)
                        };
                    })
                };
            });

            return items;
        }

        private static createVisualAxis(
            visualSize: ISize,
            items: IItemGroup[]
        ): { xAxis: IAxisProperties; yAxis: IAxisProperties } {
            const xAxis: IAxisProperties = createAxis({
                pixelSpan: visualSize.width,
                dataDomain: items.map(data => data.category as number),
                metaDataColumn: null,
                formatString: null,
                outerPadding: 0,
                innerPadding: 0.2,
                isScalar: false,
                isVertical: false
            });

            const yAxis: IAxisProperties = createAxis({
                pixelSpan: visualSize.height,
                dataDomain: [0, d3.max(items, data => d3.max(data.items, dd => <number>dd.value))],
                metaDataColumn: null,
                formatString: null,
                outerPadding: 0,
                innerPadding: 0,
                isScalar: true,
                isVertical: true
            });

            return {
                xAxis,
                yAxis
            };
        }

        private static buildLegendData(
            categoryData: ICategoryData,
            host: IVisualHost
        ): legend.LegendData {
            if (!categoryData || !categoryData.categories) return null;

            const colorHelper = new ColorHelper(host.colorPalette);

            const legendData: legend.LegendData = {
                title: categoryData.title,
                dataPoints: d3.values(categoryData.categories).map(category => ({
                    label: category.name,
                    color: colorHelper.getColorForMeasure(
                        category.columnGroup.objects,
                        category.columnGroup.name
                    ),
                    icon: legend.LegendIcon.Circle,
                    selected: false,
                    identity: ColorHelper.normalizeSelector(
                        host
                            .createSelectionIdBuilder()
                            .withCategory(category.selectionColumn, 0)
                            .createSelectionId()
                    )
                }))
            };

            console.log("Legend data");
            console.log(legendData);

            return legendData;
        }

        public update(options: VisualUpdateOptions) {
            const dataView = options && options.dataViews && options.dataViews[0];
            if (!dataView) {
                return;
            }

            this.settings = Visual.parseSettings(
                options && options.dataViews && options.dataViews[0]
            );

            // Get categories for legend
            const categoryData = Visual.getCategories(dataView);

            // Add a legend
            const legendData = Visual.buildLegendData(categoryData, this.host);
            this.legend.drawLegend(legendData, options.viewport);
            legend.positionChartArea(this.mainSvgElement, this.legend);

            // Parse data from update options
            const items = Visual.transform(dataView, categoryData, this.host);

            // margins
            const visualMargin: IMargin = { top: 20, bottom: 20, left: 20, right: 20 };

            // Axis sizes
            const axisSize: IAxisSpace = {
                heightOfX: 30,
                widthOfY: 75
            };

            // Calculate the resulting size of visual
            const visualSize: ISize = {
                width:
                    options.viewport.width -
                    visualMargin.left -
                    visualMargin.right -
                    axisSize.widthOfY,
                height:
                    options.viewport.height -
                    visualMargin.top -
                    visualMargin.bottom -
                    axisSize.heightOfX -
                    this.legend.getMargins().height
            };

            // Update the size of our SVG element
            if (this.mainSvgElement) {
                this.mainSvgElement
                    .attr("width", options.viewport.width)
                    .attr("height", options.viewport.height - this.legend.getMargins().height);
            }

            // Translate the SVG group to account for visual's margins
            this.visualSvgGroup.attr(
                "transform",
                `translate(${visualMargin.left + axisSize.widthOfY}, ${visualMargin.top})`
            );

            this.xAxisGroup.attr(
                "transform",
                `translate(${visualMargin.left + axisSize.widthOfY}, ${visualSize.height +
                    axisSize.heightOfX})`
            );

            this.yAxisGroup.attr(
                "transform",
                `translate(${visualMargin.left + axisSize.widthOfY}, ${visualMargin.top})`
            );

            let { xAxis, yAxis } = Visual.createVisualAxis(visualSize, items);

            this.renderVisual({
                items: items,
                size: visualSize,
                defaultColor: this.settings.dataPoint.defaultColor,
                hoverColor: this.settings.dataPoint.hoverColor,
                xAxis: xAxis,
                yAxis: yAxis
            });
        }

        private renderVisual(data: VisualData) {
            // Create ordinal scale for x-axis.
            const xScale = data.xAxis.scale;
            // // Create linear scale for y-axis
            const yScale = data.yAxis.scale;

            const colorHelper = new ColorHelper(this.host.colorPalette);

            // Select all bar groups in our chart and bind them to our categories.
            // Each group will contain a set of bars, one for each of the values in category.
            const barGroupSelect = this.visualSvgGroup
                .selectAll(Selectors.BarGroup.selectorName)
                .data(data.items);

            this.clearCatcher.on("click", () => {
                selectionManager.clear().then(() => barSelect.attr("fill-opacity", 1));
            });
            // When a new category added, create a new SVG group for it.
            barGroupSelect
                .enter()
                .append("g")
                .classed(Selectors.BarGroup.className, true);
            // For removed categories, remove the SVG group.
            barGroupSelect.exit().remove();
            // Update the position of existing SVG groups.
            barGroupSelect.attr("transform", d => `translate(${xScale(d.category)}, 0)`);
            // Now we bind each SVG group to the values in corresponding category.
            // To keep the length of the values array, we transform each value into object,
            // that contains both value and total count of all values in this category.
            const barSelect = barGroupSelect
                .selectAll(Selectors.Bar.selectorName)
                .data(d => d.items.map(v => ({ count: d.items.length, item: v })));

            // For each new value, we create a new rectange.
            barSelect
                .enter()
                .append("rect")
                .classed(Selectors.Bar.className, true);
            // Remove rectangles, that no longer have matching values.
            barSelect.exit().remove();

            let getColor = (d: { item: IItem }): string =>
                d.item.columnGroup
                    ? colorHelper.getColorForMeasure(
                          d.item.columnGroup.objects,
                          d.item.columnGroup.name
                      )
                    : data.defaultColor;

            const selectionManager = this.selectionManager;
            // Set the size and position of existing rectangles.
            barSelect
                .attr("x", (d, ix) => (xScale.rangeBand() / d.count) * ix)
                .attr("y", d => yScale(<number>d.item.value))
                .attr("width", d => xScale.rangeBand() / d.count)
                .attr("height", d => data.size.height - yScale(<number>d.item.value))
                .style("fill", getColor)
                .on("mouseover", function() {
                    // this is a rect object here
                    d3.select(this).style("fill", data.hoverColor);
                })
                .on("mouseout", function() {
                    // this is a rect object here
                    d3.select(this).style("fill", getColor);
                })
                .on("click", function(data) {
                    selectionManager.select(data.item.selectionId).then((ids: ISelectionId[]) => {
                        barSelect.attr("fill-opacity", ids.length ? 0.5 : 1);
                    });
                    d3.select(this).attr("fill-opacity", 1);
                });

            this.xAxisGroup.selectAll("*").remove();
            this.yAxisGroup.selectAll("*").remove();

            // data.xAxis.axis(this.xAxisGroup);
            this.xAxisGroup.call(data.xAxis.axis);
            // data.yAxis.axis(this.yAxisGroup);
            this.yAxisGroup.call(data.yAxis.axis);

            // add tooltips into the visual
            this.tooltipServiceWrapper.addTooltip(
                barSelect,
                (args: TooltipEventArgs<{ item: IItem }>): VisualTooltipDataItem[] =>
                    args.data.item.tooltipInfo.length ? args.data.item.tooltipInfo : null
            );
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /**
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
         * objects and properties you want to expose to the users in the property pane.
         *
         */
        public enumerateObjectInstances(
            options: EnumerateVisualObjectInstancesOptions
        ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            let result: VisualObjectInstanceEnumerationObject = VisualSettings.enumerateObjectInstances(
                this.settings || VisualSettings.getDefault(),
                options
            ) as VisualObjectInstanceEnumerationObject;
            if (
                result.instances[0].properties["text"] &&
                result.instances[0].properties["text"].toString().length > 30
            ) {
                result.instances[0].properties["text"] = null;
            }
            return result;
        }
    }
}
