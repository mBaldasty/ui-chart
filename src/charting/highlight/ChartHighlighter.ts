import { BarLineScatterCandleBubbleDataProvider } from '../interfaces/dataprovider/BarLineScatterCandleBubbleDataProvider';
import { IHighlighter } from './IHighlighter';
import { Highlight } from './Highlight';
import { AxisDependency } from '../components/YAxis';
import { Rounding } from '../data/DataSet';
import { IDataSet } from '../interfaces/datasets/IDataSet';
import { Entry } from '../data/Entry';

export class ChartHighlighter<T extends BarLineScatterCandleBubbleDataProvider> implements IHighlighter {
    /**
     * instance of the data-provider
     */
    protected mChart: T;

    /**
     * buffer for storing previously highlighted values
     */
    protected mHighlightBuffer: Highlight[] = [];

    constructor(chart: T) {
        this.mChart = chart;
    }

    public getHighlight(x, y) {
        const pos = this.getValsForTouch(x, y);
        let xVal = pos.x;
        // MPPointD.recycleInstance(pos);

        const high = this.getHighlightForX(xVal, x, y);
        return high;
    }

    /**
     * Returns a recyclable MPPointD instance.
     * Returns the corresponding xPos for a given touch-position in pixels.
     *
     * @param x
     * @param y
     * @return
     */
    protected getValsForTouch(x, y) {
        // take any transformer to determine the x-axis value
        const pos = this.mChart.getTransformer(AxisDependency.LEFT).getValuesByTouchPoint(x, y);
        return pos;
    }

    /**
     * Returns the corresponding Highlight for a given xVal and x- and y-touch position in pixels.
     *
     * @param xVal
     * @param x
     * @param y
     * @return
     */
    protected getHighlightForX(xVal, x, y) {
        const closestValues = this.getHighlightsAtXValue(xVal, x, y);

        if (closestValues.length === 0) {
            return null;
        }

        let leftAxisMinDist = this.getMinimumDistance(closestValues, y, AxisDependency.LEFT);
        let rightAxisMinDist = this.getMinimumDistance(closestValues, y, AxisDependency.RIGHT);

        const axis = leftAxisMinDist < rightAxisMinDist ? AxisDependency.LEFT : AxisDependency.RIGHT;

        const detail = this.getClosestHighlightByPixel(closestValues, x, y, axis, this.mChart.getMaxHighlightDistance());

        return detail;
    }

    /**
     * Returns the minimum distance from a touch value (in pixels) to the
     * closest value (in pixels) that is displayed in the chart.
     *
     * @param closestValues
     * @param pos
     * @param axis
     * @return
     */
    protected getMinimumDistance(closestValues, pos, axis) {
        let distance = Number.MAX_VALUE;

        for (let i = 0; i < closestValues.length; i++) {
            const high = closestValues.get(i);

            if (high.getAxis() == axis) {
                let tempDistance = Math.abs(this.getHighlightPos(high) - pos);
                if (tempDistance < distance) {
                    distance = tempDistance;
                }
            }
        }

        return distance;
    }

    protected getHighlightPos(h: Highlight) {
        return h.yPx;
    }

    /**
     * Returns a list of Highlight objects representing the entries closest to the given xVal.
     * The returned list contains two objects per DataSet (closest rounding up, closest rounding down).
     *
     * @param xVal the transformed x-value of the x-touch position
     * @param x    touch position
     * @param y    touch position
     * @return
     */
    protected getHighlightsAtXValue(xVal, x, y) {
        this.mHighlightBuffer = [];

        const data = this.getData();

        if (data == null) return this.mHighlightBuffer;

        for (let i = 0, dataSetCount = data.getDataSetCount(); i < dataSetCount; i++) {
            const dataSet = data.getDataSetByIndex(i);

            // don't include DataSets that cannot be highlighted
            if (!dataSet.isHighlightEnabled()) continue;
            Array.prototype.push.apply(this.mHighlightBuffer, this.buildHighlights(dataSet, i, xVal, Rounding.CLOSEST));
        }

        return this.mHighlightBuffer;
    }

    /**
     * An array of `Highlight` objects corresponding to the selected xValue and dataSetIndex.
     *
     * @param set
     * @param dataSetIndex
     * @param xVal
     * @param rounding
     * @return
     */
    protected buildHighlights(set: IDataSet<Entry>, dataSetIndex, xVal, rounding) {
        const xProperty = set.xProperty;
        const yProperty = set.yProperty;
        const highlights = [];

        //noinspection unchecked
        let entries = set.getEntriesForXValue(xVal);
        if (entries.length == 0) {
            // Try to find closest x-value and take all entries for that x-value
            const closest = set.getEntryForXValue(xVal, NaN, rounding);
            if (closest != null) {
                //noinspection unchecked
                entries = set.getEntriesForXValue(closest[xProperty]);
            }
        }

        if (entries.length == 0) return highlights;

        for (let e of entries) {
            const pixels = this.mChart.getTransformer(set.getAxisDependency()).getPixelForValues(e[xProperty], e[yProperty]);

            highlights.push({
                x: e[xProperty],
                y: e[yProperty],
                xPx: pixels.x,
                yPx: pixels.y,
                dataSetIndex,
                axis: set.getAxisDependency()
            });
        }

        return highlights;
    }

    /**
     * Returns the Highlight of the DataSet that contains the closest value on the
     * y-axis.
     *
     * @param closestValues        contains two Highlight objects per DataSet closest to the selected x-position (determined by
     *                             rounding up an down)
     * @param x
     * @param y
     * @param axis                 the closest axis
     * @param minSelectionDistance
     * @return
     */
    public getClosestHighlightByPixel(closestValues: Highlight[], x, y, axis, minSelectionDistance) {
        let closest = null;
        let distance = minSelectionDistance;

        for (let i = 0; i < closestValues.length; i++) {
            let high = closestValues[i];

            if (axis == null || high.axis == axis) {
                let cDistance = this.getDistance(x, y, high.xPx, high.yPx);

                if (cDistance < distance) {
                    closest = high;
                    distance = cDistance;
                }
            }
        }

        return closest;
    }

    /**
     * Calculates the distance between the two given points.
     *
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @return
     */
    protected getDistance(x1, y1, x2, y2) {
        //return Math.abs(y1 - y2);
        //return Math.abs(x1 - x2);
        return Math.hypot(x1 - x2, y1 - y2);
    }

    protected getData() {
        return this.mChart.getData();
    }
}