import { IDataSet } from '../interfaces/datasets/IDataSet';
import { Entry } from './Entry';
import { AxisDependency } from '../components/YAxis';

export abstract class ChartData<U extends Entry, T extends IDataSet<U>> {
    /**
     * maximum y-value in the value array across all axes
     */
    mYMax = -Number.MAX_VALUE;

    /**
     * the minimum y-value in the value array across all axes
     */
    mYMin = Number.MAX_VALUE;

    /**
     * maximum x-value in the value array
     */
    mXMax = -Number.MAX_VALUE;

    /**
     * minimum x-value in the value array
     */
    mXMin = Number.MAX_VALUE;

    mLeftAxisMax = -Number.MAX_VALUE;

    mLeftAxisMin = Number.MAX_VALUE;

    mRightAxisMax = -Number.MAX_VALUE;

    mRightAxisMin = Number.MAX_VALUE;

    /**
     * array that holds all DataSets the ChartData object represents
     */
    protected mDataSets: T[];

    /**
     * Default constructor.
     */
    // public ChartData() {
    //     this.mDataSets = [];
    // }

    /**
     * Constructor taking single or multiple DataSet objects.
     *
     * @param dataSets
     */
    constructor(dataSets: T[]) {
        this.mDataSets = dataSets;
        this.notifyDataChanged();
    }

    // /**
    //  * Created because Arrays.asList(...) does not support modification.
    //  *
    //  * @param array
    //  * @return
    //  */
    // private List<T> arrayToList(T[] array) {

    //     List<T> list = new ArrayList<>();

    //     for (T set : array) {
    //         list.add(set);
    //     }

    //     return list;
    // }

    // /**
    //  * constructor for chart data
    //  *
    //  * @param sets the dataset array
    //  */
    // public ChartData(List<T> sets) {
    //     this.mDataSets = sets;
    //     notifyDataChanged();
    // }

    /**
     * Call this method to let the ChartData know that the underlying data has
     * changed. Calling this performs all necessary recalculations needed when
     * the contained data has changed.
     */
    public notifyDataChanged() {
        this.calcMinMax();
    }

    /**
     * Calc minimum and maximum y-values over all DataSets.
     * Tell DataSets to recalculate their min and max y-values, this is only needed for autoScaleMinMax.
     *
     * @param fromX the x-value to start the calculation from
     * @param toX   the x-value to which the calculation should be performed
     */
    public calcMinMaxYRange(fromX, toX) {
        for (let set of this.mDataSets) {
            set.calcMinMaxYRange(fromX, toX);
        }

        // apply the new data
        this.calcMinMax();
    }

    /**
     * Calc minimum and maximum values (both x and y) over all DataSets.
     */
    protected calcMinMax() {
        if (this.mDataSets == null) return;

        this.mYMax = -Number.MAX_VALUE;
        this.mYMin = Number.MAX_VALUE;
        this.mXMax = -Number.MAX_VALUE;
        this.mXMin = Number.MAX_VALUE;

        for (let set of this.mDataSets) {
            this.calcMinMaxForDataSet(set);
        }

        this.mLeftAxisMax = -Number.MAX_VALUE;
        this.mLeftAxisMin = Number.MAX_VALUE;
        this.mRightAxisMax = -Number.MAX_VALUE;
        this.mRightAxisMin = Number.MAX_VALUE;

        // left axis
        const firstLeft = this.getFirstLeft(this.mDataSets);

        if (firstLeft != null) {
            this.mLeftAxisMax = firstLeft.getYMax();
            this.mLeftAxisMin = firstLeft.getYMin();

            for (let dataSet of this.mDataSets) {
                if (dataSet.getAxisDependency() == AxisDependency.LEFT) {
                    if (dataSet.getYMin() < this.mLeftAxisMin) this.mLeftAxisMin = dataSet.getYMin();

                    if (dataSet.getYMax() > this.mLeftAxisMax) this.mLeftAxisMax = dataSet.getYMax();
                }
            }
        }

        // right axis
        const firstRight = this.getFirstRight(this.mDataSets);

        if (firstRight != null) {
            this.mRightAxisMax = firstRight.getYMax();
            this.mRightAxisMin = firstRight.getYMin();

            for (let dataSet of this.mDataSets) {
                if (dataSet.getAxisDependency() == AxisDependency.RIGHT) {
                    if (dataSet.getYMin() < this.mRightAxisMin) this.mRightAxisMin = dataSet.getYMin();

                    if (dataSet.getYMax() > this.mRightAxisMax) this.mRightAxisMax = dataSet.getYMax();
                }
            }
        }
    }

    /** ONLY GETTERS AND SETTERS BELOW THIS */

    /**
     * returns the number of LineDataSets this object contains
     *
     * @return
     */
    public getDataSetCount() {
        if (this.mDataSets == null) return 0;
        return this.mDataSets.length;
    }

    /**
     * Returns the minimum y-value for the specified axis.
     *
     * @param axis
     * @return
     */
    public getYMin(axis?) {
        if (axis === undefined) {
            return this.mYMin;
        }
        if (axis == AxisDependency.LEFT) {
            if (this.mLeftAxisMin == Number.MAX_VALUE) {
                return this.mRightAxisMin;
            } else return this.mLeftAxisMin;
        } else {
            if (this.mRightAxisMin == Number.MAX_VALUE) {
                return this.mLeftAxisMin;
            } else return this.mRightAxisMin;
        }
    }

    /**
     * Returns the maximum y-value for the specified axis.
     *
     * @param axis
     * @return
     */
    public getYMax(axis?: AxisDependency) {
        if (axis === undefined) {
            return this.mYMax;
        }
        if (axis == AxisDependency.LEFT) {
            if (this.mLeftAxisMax == -Number.MAX_VALUE) {
                return this.mRightAxisMax;
            } else return this.mLeftAxisMax;
        } else {
            if (this.mRightAxisMax == -Number.MAX_VALUE) {
                return this.mLeftAxisMax;
            } else return this.mRightAxisMax;
        }
    }

    /**
     * Returns the minimum x-value this data object contains.
     *
     * @return
     */
    public getXMin() {
        return this.mXMin;
    }

    /**
     * Returns the maximum x-value this data object contains.
     *
     * @return
     */
    public getXMax() {
        return this.mXMax;
    }

    /**
     * Returns all DataSet objects this ChartData object holds.
     *
     * @return
     */
    public getDataSets() {
        return this.mDataSets;
    }

    /**
     * Retrieve the index of a DataSet with a specific label from the ChartData.
     * Search can be case sensitive or not. IMPORTANT: This method does
     * calculations at runtime, do not over-use in performance critical
     * situations.
     *
     * @param dataSets   the DataSet array to search
     * @param label
     * @param ignorecase if true, the search is not case-sensitive
     * @return
     */
    protected getDataSetIndexByLabel(dataSets, label, ignorecase) {
        if (ignorecase) {
            for (let i = 0; i < dataSets.length; i++) if (label.equalsIgnoreCase(dataSets.get(i).getLabel())) return i;
        } else {
            for (let i = 0; i < dataSets.length; i++) if (label.equals(dataSets.get(i).getLabel())) return i;
        }

        return -1;
    }

    /**
     * Returns the labels of all DataSets as a string array.
     *
     * @return
     */
    public getDataSetLabels() {
        const types = [];

        for (let i = 0; i < this.mDataSets.length; i++) {
            types[i] = this.mDataSets[i].getLabel();
        }

        return types;
    }

    /**
     * Get the Entry for a corresponding highlight object
     *
     * @param highlight
     * @return the entry that is highlighted
     */
    public getEntryForHighlight(highlight) {
        if (highlight.getDataSetIndex() >= this.mDataSets.length) return null;
        else {
            return this.mDataSets[highlight.getDataSetIndex()].getEntryForXValue(highlight.getX(), highlight.getY());
        }
    }

    /**
     * Returns the DataSet object with the given label. Search can be case
     * sensitive or not. IMPORTANT: This method does calculations at runtime.
     * Use with care in performance critical situations.
     *
     * @param label
     * @param ignorecase
     * @return
     */
    public getDataSetByLabel(label, ignorecase) {
        const index = this.getDataSetIndexByLabel(this.mDataSets, label, ignorecase);

        if (index < 0 || index >= this.mDataSets.length) return null;
        else return this.mDataSets[index];
    }

    public getDataSetByIndex(index:number) {
        if (this.mDataSets == null || index < 0 || index >= this.mDataSets.length) return null;

        return this.mDataSets[index];
    }

    /**
     * Adds a DataSet dynamically.
     *
     * @param d
     */
    public addDataSet(d: T) {
        if (d == null) return;

        this.calcMinMaxForDataSet(d);

        this.mDataSets.push(d);
    }

    /**
     * Removes the given DataSet from this data object. Also recalculates all
     * minimum and maximum values. Returns true if a DataSet was removed, false
     * if no DataSet could be removed.
     *
     * @param d
     */
    public removeDataSet(d: T) {
        if (d == null) return false;

        const index = this.mDataSets.indexOf(d);

        // if a DataSet was removed
        if (index >= 0) {
            this.mDataSets.splice(index, 1);
            this.calcMinMax();
        }

        return index >= 0;
    }

    /**
     * Removes the DataSet at the given index in the DataSet array from the data
     * object. Also recalculates all minimum and maximum values. Returns true if
     * a DataSet was removed, false if no DataSet could be removed.
     *
     * @param index
     */
    public removeDataSetAtIndex(index) {
        if (index >= this.mDataSets.length || index < 0) return false;

        this.mDataSets.splice(index, 1);
        this.calcMinMax();
        return true;
    }

    /**
     * Adds an Entry to the DataSet at the specified index.
     * Entries are added to the end of the list.
     *
     * @param e
     * @param dataSetIndex
     */
    public addEntry(e, dataSetIndex) {
        if (this.mDataSets.length > dataSetIndex && dataSetIndex >= 0) {
            const set = this.mDataSets[dataSetIndex];
            // add the entry to the dataset
            if (!set.addEntry(e)) return;

            this.calcMinMaxForEntry(e, set.getAxisDependency());
        } else {
            console.error('addEntry', 'Cannot add Entry because dataSetIndex too high or too low.');
        }
    }

    /**
     * Adjusts the current minimum and maximum values based on the provided Entry object.
     *
     * @param e
     * @param axis
     */
    protected calcMinMaxForEntry(e, axis) {
        if (this.mYMax < e.getY()) this.mYMax = e.getY();
        if (this.mYMin > e.getY()) this.mYMin = e.getY();

        if (this.mXMax < e.getX()) this.mXMax = e.getX();
        if (this.mXMin > e.getX()) this.mXMin = e.getX();

        if (axis == AxisDependency.LEFT) {
            if (this.mLeftAxisMax < e.getY()) this.mLeftAxisMax = e.getY();
            if (this.mLeftAxisMin > e.getY()) this.mLeftAxisMin = e.getY();
        } else {
            if (this.mRightAxisMax < e.getY()) this.mRightAxisMax = e.getY();
            if (this.mRightAxisMin > e.getY()) this.mRightAxisMin = e.getY();
        }
    }

    /**
     * Adjusts the minimum and maximum values based on the given DataSet.
     *
     * @param d
     */
    protected calcMinMaxForDataSet(d: T) {
        if (this.mYMax < d.getYMax()) this.mYMax = d.getYMax();
        if (this.mYMin > d.getYMin()) this.mYMin = d.getYMin();

        if (this.mXMax < d.getXMax()) this.mXMax = d.getXMax();
        if (this.mXMin > d.getXMin()) this.mXMin = d.getXMin();

        if (d.getAxisDependency() == AxisDependency.LEFT) {
            if (this.mLeftAxisMax < d.getYMax()) this.mLeftAxisMax = d.getYMax();
            if (this.mLeftAxisMin > d.getYMin()) this.mLeftAxisMin = d.getYMin();
        } else {
            if (this.mRightAxisMax < d.getYMax()) this.mRightAxisMax = d.getYMax();
            if (this.mRightAxisMin > d.getYMin()) this.mRightAxisMin = d.getYMin();
        }
    }

    /**
     * Removes the given Entry object from the DataSet at the specified index.
     *
     * @param e
     * @param dataSetIndex
     */
    public removeEntry(e, dataSetIndex) {
        // entry null, outofbounds
        if (e == null || dataSetIndex >= this.mDataSets.length) return false;

        const set = this.mDataSets[dataSetIndex];

        if (set != null) {
            // remove the entry from the dataset
            const removed = set.removeEntry(e);

            if (removed) {
                this.calcMinMax();
            }

            return removed;
        } else return false;
    }

    /**
     * Removes the Entry object closest to the given DataSet at the
     * specified index. Returns true if an Entry was removed, false if no Entry
     * was found that meets the specified requirements.
     *
     * @param xValue
     * @param dataSetIndex
     * @return
     */
    public removeEntryForXValue(xValue, dataSetIndex) {
        if (dataSetIndex >= this.mDataSets.length) return false;

        const dataSet = this.mDataSets[dataSetIndex];
        const e = dataSet.getEntryForXValue(xValue, NaN);

        if (e == null) return false;

        return this.removeEntry(e, dataSetIndex);
    }

    /**
     * Returns the DataSet that contains the provided Entry, or null, if no
     * DataSet contains this Entry.
     *
     * @param e
     * @return
     */
    public getDataSetForEntry(e) {
        if (e == null) return null;

        for (let i = 0; i < this.mDataSets.length; i++) {
            const set = this.mDataSets[i];

            for (let j = 0; j < set.getEntryCount(); j++) {
                if (e.equalTo(set.getEntryForXValue(e.getX(), e.getY()))) return set;
            }
        }

        return null;
    }

    /**
     * Returns all colors used across all DataSet objects this object
     * represents.
     *
     * @return
     */
    public getColors() {
        if (this.mDataSets == null) return null;

        let clrcnt = 0;

        for (let i = 0; i < this.mDataSets.length; i++) {
            clrcnt += this.mDataSets[i].getColors().length;
        }

        const colors = [];
        let cnt = 0;

        for (let i = 0; i < this.mDataSets.length; i++) {
            const clrs = this.mDataSets[i].getColors();

            for (let clr of clrs) {
                colors[cnt] = clr;
                cnt++;
            }
        }

        return colors;
    }

    /**
     * Returns the index of the provided DataSet in the DataSet array of this data object, or -1 if it does not exist.
     *
     * @param dataSet
     * @return
     */
    public getIndexOfDataSet(dataSet) {
        return this.mDataSets.indexOf(dataSet);
    }

    /**
     * Returns the first DataSet from the datasets-array that has it's dependency on the left axis.
     * Returns null if no DataSet with left dependency could be found.
     *
     * @return
     */
    protected getFirstLeft(sets) {
        for (let dataSet of sets) {
            if (dataSet.getAxisDependency() == AxisDependency.LEFT) return dataSet;
        }
        return null;
    }

    /**
     * Returns the first DataSet from the datasets-array that has it's dependency on the right axis.
     * Returns null if no DataSet with right dependency could be found.
     *
     * @return
     */
    public getFirstRight(sets) {
        for (let dataSet of sets) {
            if (dataSet.getAxisDependency() == AxisDependency.RIGHT) return dataSet;
        }
        return null;
    }

    /**
     * Sets a custom IValueFormatter for all DataSets this data object contains.
     *
     * @param f
     */
    public setValueFormatter(f) {
        if (f == null) return;
        else {
            for (let set of this.mDataSets) {
                set.setValueFormatter(f);
            }
        }
    }

    /**
     * Sets the color of the value-text (color in which the value-labels are
     * drawn) for all DataSets this data object contains.
     *
     * @param color
     */
    public setValueTextColor(color) {
        for (let set of this.mDataSets) {
            set.setValueTextColor(color);
        }
    }

    /**
     * Sets the same list of value-colors for all DataSets this
     * data object contains.
     *
     * @param colors
     */
    public setValueTextColors(colors) {
        for (let set of this.mDataSets) {
            set.setValueTextColors(colors);
        }
    }

    /**
     * Sets the Typeface for all value-labels for all DataSets this data object
     * contains.
     *
     * @param tf
     */
    public setValueTypeface(tf) {
        for (let set of this.mDataSets) {
            set.setValueTypeface(tf);
        }
    }

    /**
     * Sets the size (in dp) of the value-text for all DataSets this data object
     * contains.
     *
     * @param size
     */
    public setValueTextSize(size) {
        for (let set of this.mDataSets) {
            set.setValueTextSize(size);
        }
    }

    /**
     * Enables / disables drawing values (value-text) for all DataSets this data
     * object contains.
     *
     * @param enabled
     */
    public setDrawValues(enabled) {
        for (let set of this.mDataSets) {
            set.setDrawValues(enabled);
        }
    }

    /**
     * Enables / disables highlighting values for all DataSets this data object
     * contains. If set to true, this means that values can
     * be highlighted programmatically or by touch gesture.
     */
    public setHighlightEnabled(enabled) {
        for (let set of this.mDataSets) {
            set.setHighlightEnabled(enabled);
        }
    }

    /**
     * Returns true if highlighting of all underlying values is enabled, false
     * if not.
     *
     * @return
     */
    public isHighlightEnabled() {
        for (let set of this.mDataSets) {
            if (!set.isHighlightEnabled()) return false;
        }
        return true;
    }

    /**
     * Clears this data object from all DataSets and removes all Entries. Don't
     * forget to invalidate the chart after this.
     */
    public clearValues() {
        if (this.mDataSets != null) {
            this.mDataSets = [];
        }
        this.notifyDataChanged();
    }

    /**
     * Checks if this data object contains the specified DataSet. Returns true
     * if so, false if not.
     *
     * @param dataSet
     * @return
     */
    public contains(dataSet) {
        return this.mDataSets.indexOf(dataSet) >= 0;
    }

    /**
     * Returns the total entry count across all DataSet objects this data object contains.
     *
     * @return
     */
    public getEntryCount() {
        let count = 0;

        for (let set of this.mDataSets) {
            count += set.getEntryCount();
        }

        return count;
    }

    /**
     * Returns the DataSet object with the maximum number of entries or null if there are no DataSets.
     *
     * @return
     */
    public getMaxEntryCountSet() {
        if (this.mDataSets == null || this.mDataSets.length === 0) return null;

        let max = this.mDataSets[0];

        for (let set of this.mDataSets) {
            if (set.getEntryCount() > max.getEntryCount()) max = set;
        }

        return max;
    }
}