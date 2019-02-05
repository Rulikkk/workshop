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
    export class Visual implements IVisual {
        private settings: VisualSettings; // settings field might already be there, so don't declare it twice
        private mainSvgElement: d3.Selection<SVGElement>;
        private visualSvgGroup: d3.Selection<SVGElement>;

        private xAxisGroup: d3.Selection<SVGElement>;
        private yAxisGroup: d3.Selection<SVGElement>;
        constructor(options: VisualConstructorOptions) {
            // Create d3 selection from main HTML element
            const mainElement = d3.select(options.element);
            // Append SVG element to it. This SVG will contain our visual
            this.mainSvgElement = mainElement.append("svg");
            // Append an svg group that will contain our visual
            this.visualSvgGroup = this.mainSvgElement.append("g");

            this.xAxisGroup = this.mainSvgElement.append("g");
            this.xAxisGroup.classed("xAxis", true);
            //axis groups
            this.yAxisGroup = this.mainSvgElement.append("g");
            this.yAxisGroup.classed("yAxis", true);
        }

        private static transform(dataView: DataView): IItemGroup[] {
            if (!dataView.categorical &&
                !dataView.categorical.categories &&
                !dataView.categorical.categories.length &&
                !dataView.categorical.categories[0].values &&
                !dataView.categorical.values &&
                !dataView.categorical.values.length
                ) {
                return;
            }

            const values = dataView.categorical.values;

            const categories = dataView.categorical.categories[0].values;

            const items = categories.map<IItemGroup>(
                (category, index) => ({ 
                    category: category,
                    items: values.map<PrimitiveValue>( (valueObject) => valueObject.values[index] )
                })
            );

            return items;
        }

        private static createVisualAxis(visualSize: ISize, items: IItemGroup[]): { xAxis: IAxisProperties, yAxis: IAxisProperties } {
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
                dataDomain: [0, d3.max(items, data => d3.max(data.items, dd => <number>dd))],
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
            }
        }

        public update(options: VisualUpdateOptions) {
            const dataView = options && options.dataViews && options.dataViews[0];
            if (!dataView) {
                return;
            }

            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);

            // Parse data from update options
            const items = Visual.transform(dataView);

            // margins
            const visualMargin: IMargin = { top: 20, bottom: 20, left: 20, right: 20 };

            // Axis sizes
            const axisSize: IAxisSpace = {
                heightOfX: 30,
                widthOfY: 75
            };

            // Calculate the resulting size of visual
            const visualSize: ISize = {
                width: options.viewport.width - visualMargin.left - visualMargin.right - axisSize.widthOfY,
                height: options.viewport.height - visualMargin.top - visualMargin.bottom - axisSize.heightOfX,
            };

            // Update the size of our SVG element
            if (this.mainSvgElement) {
                this.mainSvgElement
                    .attr("width", options.viewport.width)
                    .attr("height", options.viewport.height);
            }

            // Translate the SVG group to account for visual's margins
            this.visualSvgGroup.attr(
                "transform",
                `translate(${visualMargin.left + axisSize.widthOfY}, ${visualMargin.top})`);

            this.xAxisGroup.attr(
                    "transform",
                    `translate(${visualMargin.left + axisSize.widthOfY}, ${visualSize.height + axisSize.heightOfX})`);

            this.yAxisGroup.attr(
                    "transform",
                    `translate(${visualMargin.left + axisSize.widthOfY}, ${visualMargin.top})`);

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

            // Select all bar groups in our chart and bind them to our categories.
            // Each group will contain a set of bars, one for each of the values in category.
            const barGroupSelect = this.visualSvgGroup.selectAll(".bar-group")
                .data(data.items);
            // When a new category added, create a new SVG group for it.
            barGroupSelect.enter()
                .append("g")
                .attr("class", "bar-group");
            // For removed categories, remove the SVG group.
            barGroupSelect.exit()
                .remove();
            // Update the position of existing SVG groups.
            barGroupSelect.attr("transform", d => `translate(${xScale(d.category)}, 0)`);
            // Now we bind each SVG group to the values in corresponding category.
            // To keep the length of the values array, we transform each value into object,
            // that contains both value and total count of all values in this category.
            const barSelect = barGroupSelect
                .selectAll(".bar")
                .data(d => d.items.map(v => ({ count: d.items.length, value: v })));
            // For each new value, we create a new rectange.
            barSelect.enter().append("rect")
                .attr("class", "bar");
            // Remove rectangles, that no longer have matching values.
            barSelect.exit()
                .remove();
            // Set the size and position of existing rectangles.
            barSelect.attr("x", (d, ix) => xScale.rangeBand() / d.count * ix)
                .attr("y", d => data.size.height - yScale(<number>d.value))
                .attr("width", d => xScale.rangeBand() / d.count)
                .attr("height", d => yScale(<number>d.value))
                .style("fill", data.defaultColor)
                .on("mouseover", function() {
                    // this is a rect object here
                    d3.select(this).style("fill", data.hoverColor);
                })
                .on("mouseout", function() {
                    // this is a rect object here
                    d3.select(this).style("fill", data.defaultColor);
                });

            this.xAxisGroup.selectAll("*").remove();
            this.yAxisGroup.selectAll("*").remove();

            // data.xAxis.axis(this.xAxisGroup);
            this.xAxisGroup.call(data.xAxis.axis);
            // data.yAxis.axis(this.yAxisGroup);
            this.yAxisGroup.call(data.yAxis.axis);
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            let result: VisualObjectInstanceEnumerationObject = VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options) as VisualObjectInstanceEnumerationObject;
            if (result.instances[0].properties["text"] && result.instances[0].properties["text"].toString().length > 30) {
                result.instances[0].properties["text"] = null;
            }
            return result;
        }
    }
}