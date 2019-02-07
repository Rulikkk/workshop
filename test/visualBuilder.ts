/// <reference path="_references.ts"/>

module powerbi.extensibility.visual.test {
    // powerbi.extensibility.utils.test
    import VisualBuilderBase = powerbi.extensibility.utils.test.VisualBuilderBase;

    // AsterPlot1443303142064
    import VisualClass = powerbi.extensibility.visual.gettingStarted75F9A38F073246ED8F430166D2E03B3E.Visual;

    export class WorkshopVisualBuilder extends VisualBuilderBase<VisualClass> {
        constructor(width: number, height: number) {
            super(width, height, "gettingStarted75F9A38F073246ED8F430166D2E03B3E");
        }

        protected build(options: VisualConstructorOptions): VisualClass {
            return new VisualClass(options);
        }

        public get mainElement(): JQuery {
            return this.element.children("svg");
        }

        public get barGroups(): JQuery {
            return $(".bar-group");
        }

        public get bars(): JQuery {
            return $(".bar");
        }

        public get legend(): JQuery {
            return $(".legend");
        }

    }
}