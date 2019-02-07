module powerbi.extensibility.visual.test {
    import WorkshopVisualBuilder = powerbi.extensibility.visual.test.WorkshopVisualBuilder;
    import WorkshopVisualData = powerbi.extensibility.visual.test.WorkshopVisualData;
    import WorkshopVisual = powerbi.extensibility.visual.gettingStarted75F9A38F073246ED8F430166D2E03B3E.Visual;
    describe("Workshop Visual tests", () => {
        let target: HTMLElement;
        let visualBuilder: WorkshopVisualBuilder;
        let dataBuilder: WorkshopVisualData;
        beforeEach(() => {
            target = document.createElement("div");
            visualBuilder = new WorkshopVisualBuilder(300, 400);
            dataBuilder = new WorkshopVisualData();
        });

        describe("Test cases for visual constructor", () => {
            it("custom visual constructor should be called", (done) => {
                const visual = new WorkshopVisual({
                    element: target,
                    host: visualBuilder.visualHost
                });
                expect(visual).toBeDefined();
                done();
            })
        });

        describe("Test cases for dateView", () => {
            it("data view was created", (done) => {
                let dataView: DataView = dataBuilder.getDataView();
                visualBuilder.updateRenderTimeout(dataView, ()=> {
                    done();
                });
            });

            it("visual bars group was rendered", (done) => {
                let dataView: DataView = dataBuilder.getDataView();
                visualBuilder.updateRenderTimeout(dataView, ()=> {
                    expect(visualBuilder.barGroups).toBeInDOM();
                    done();
                });
            });

            it("visual bars was rendered", (done) => {
                let dataView: DataView = dataBuilder.getDataView();
                visualBuilder.updateRenderTimeout(dataView, ()=> {
                    expect(visualBuilder.bars).toBeInDOM();
                    done();
                });
            });

            it("visual legend was rendered", (done) => {
                let dataView: DataView = dataBuilder.getDataView();
                visualBuilder.updateRenderTimeout(dataView, ()=> {
                    expect(visualBuilder.legend).toBeInDOM();
                    expect(visualBuilder.legend.length).toBe(1);
                    done();
                });
            });
        });
    });

}