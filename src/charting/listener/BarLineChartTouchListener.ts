import { Matrix } from '@nativescript-community/ui-canvas';
import { BarLineChartBase } from '../charts/BarLineChartBase';
import { IDataSet } from '../interfaces/datasets/IDataSet';
import { CLog, CLogTypes, Utils } from '../utils/Utils';
import { ChartGesture, ChartTouchListener } from './ChartTouchListener';
import {
    GestureHandlerStateEvent,
    GestureHandlerTouchEvent,
    GestureState,
    GestureStateEventData,
    GestureTouchEventData,
    HandlerType,
    LongPressGestureHandler,
    Manager,
    PanGestureHandler,
    PinchGestureHandler,
    TapGestureHandler
} from '@nativescript-community/gesturehandler';
import { Trace } from '@nativescript/core';

const LOG_TAG = 'BarLineChartTouchListener';

let TAP_HANDLER_TAG = 12450000;
let DOUBLE_TAP_HANDLER_TAG = 12451000;
let PINCH_HANDLER_TAG = 12452000;
let PAN_HANDLER_TAG = 12453000;

/**
 * TouchListener for Bar-, Line-, Scatter- and CandleStickChart with handles all
 * touch interaction. Longpress == Zoom out. Double-Tap == Zoom in.
 *

 */
export class BarLineChartTouchListener extends ChartTouchListener<BarLineChartBase<any, any, any>> {
    /**
     * the original touch-matrix from the chart
     */
    private mMatrix = new Matrix();

    /**
     * matrix for saving the original matrix state
     */
    private mSavedMatrix = new Matrix();

    /**
     * center between two pointers (fingers on the display)
     */
    private mTouchPointCenter = { x: 0, y: 0 };

    private mSavedXDist = 1;
    private mSavedYDist = 1;

    private mClosestDataSetToTouch: IDataSet<any>;

    private mDecelerationVelocity = { x: 0, y: 0 };

    /**
     * Constructor with initialization parameters.
     *
     * @param chart               instance of the chart
     * @param touchMatrix         the touch-matrix of the chart
     * @param dragTriggerDistance the minimum movement distance that will be interpreted as a "drag" gesture in dp (3dp equals
     *                            to about 9 pixels on a 5.5" FHD screen)
     */
    TAP_HANDLER_TAG;
    DOUBLE_TAP_HANDLER_TAG;
    PINCH_HANDLER_TAG;
    PAN_HANDLER_TAG;
    constructor(chart: BarLineChartBase<any, any, any>, touchMatrix: Matrix, dragTriggerDistance) {
        super(chart);
        this.mMatrix = touchMatrix;

        this.TAP_HANDLER_TAG = TAP_HANDLER_TAG++;
        this.DOUBLE_TAP_HANDLER_TAG = DOUBLE_TAP_HANDLER_TAG++;
        this.PINCH_HANDLER_TAG = PINCH_HANDLER_TAG++;
        this.PAN_HANDLER_TAG = PAN_HANDLER_TAG++;
    }

    panGestureHandler: PanGestureHandler;
    pinchGestureHandler: PinchGestureHandler;
    tapGestureHandler: TapGestureHandler;
    doubleTapGestureHandler: TapGestureHandler;

    getPanGestureOptions() {
        return { gestureTag: this.PAN_HANDLER_TAG, ...(this.mChart.panGestureOptions || {}) };
    }
    getPinchGestureOptions() {
        return { gestureTag: this.PINCH_HANDLER_TAG, ...(this.mChart.pinchGestureOptions || {}) };
    }
    getTapGestureOptions() {
        return { gestureTag: this.TAP_HANDLER_TAG, ...(this.mChart.tapGestureOptions || {}) };
    }
    getDoubleTapGestureOptions() {
        return { gestureTag: this.DOUBLE_TAP_HANDLER_TAG, ...(this.mChart.doubleTapGestureOptions || {}) };
    }
    getOrCreateDoubleTapGestureHandler() {
        if (!this.doubleTapGestureHandler) {
            const manager = Manager.getInstance();
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'creating double tap gesture');
            }
            const options = this.getDoubleTapGestureOptions();
            this.doubleTapGestureHandler = manager
                .createGestureHandler(HandlerType.TAP, options.gestureTag, { numberOfTaps: 2, ...options })
                .on(GestureHandlerStateEvent, this.onDoubleTapGesture, this);
        }
        return this.doubleTapGestureHandler;
    }
    getOrCreateTapGestureHandler() {
        if (!this.tapGestureHandler) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'creating tap gesture');
            }
            const manager = Manager.getInstance();
            const options = this.getTapGestureOptions();
            const doubleTapOptions = this.getDoubleTapGestureOptions();
            this.tapGestureHandler = manager
                .createGestureHandler(HandlerType.TAP, options.gestureTag, { waitFor: [doubleTapOptions.gestureTag], ...options })
                .on(GestureHandlerStateEvent, this.onTapGesture, this);
        }
        return this.tapGestureHandler;
    }
    getOrCreatePinchGestureHandler() {
        if (!this.pinchGestureHandler) {
            const manager = Manager.getInstance();

            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'creating pinch gesture');
            }
            const panOptions = this.getPanGestureOptions();
            const pinchOptions = this.getPinchGestureOptions();
            this.pinchGestureHandler = manager
                .createGestureHandler(HandlerType.PINCH, pinchOptions.gestureTag, {
                    minSpan: 20,
                    simultaneousHandlers: [panOptions.gestureTag],
                    shouldCancelWhenOutside: false,
                    ...pinchOptions
                })
                .on(GestureHandlerStateEvent, this.onPinchGestureState, this)
                .on(GestureHandlerTouchEvent, this.onPinchGestureTouch, this);
        }
        return this.pinchGestureHandler;
    }
    getOrCreatePanGestureHandler() {
        if (!this.panGestureHandler) {
            const manager = Manager.getInstance();
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'creating pan gestures');
            }
            const panOptions = this.getPanGestureOptions();
            const pinchOptions = this.getPinchGestureOptions();
            this.panGestureHandler = manager
                .createGestureHandler(HandlerType.PAN, panOptions.gestureTag, {
                    simultaneousHandlers: [pinchOptions.gestureTag],
                    minPointers: 1,
                    maxPointers: 2,
                    shouldCancelWhenOutside: false,
                    ...panOptions
                })
                .on(GestureHandlerStateEvent, this.onPanGestureState, this)
                .on(GestureHandlerTouchEvent, this.onPanGestureTouch, this);
        }
        return this.panGestureHandler;
    }

    setDoubleTap(enabled: boolean) {
        const chart = this.mChart;
        if (enabled) {
            this.getOrCreateDoubleTapGestureHandler().attachToView(chart);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'enabling double tap gestures');
            }
        } else if (this.doubleTapGestureHandler) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'disabling double tap gestures');
            }
            this.doubleTapGestureHandler.detachFromView(chart);
        }
    }
    setTap(enabled: boolean) {
        const chart = this.mChart;
        if (enabled) {
            this.getOrCreateTapGestureHandler().attachToView(chart);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'enabling tap gestures');
            }
        } else if (this.tapGestureHandler) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'disabling tap gestures');
            }
            this.tapGestureHandler.detachFromView(chart);
        }
    }
    setPinch(enabled: boolean) {
        const chart = this.mChart;
        if (enabled) {
            this.getOrCreatePinchGestureHandler().attachToView(chart);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'enabling pinch gestures');
            }
        } else if (this.pinchGestureHandler) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'disabling pinch gestures');
            }
            this.pinchGestureHandler.detachFromView(chart);
        }
    }
    setPan(enabled: boolean) {
        const chart = this.mChart;
        if (enabled) {
            this.getOrCreatePanGestureHandler().attachToView(chart);
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'enabling pan gestures');
            }
        } else if (this.panGestureHandler) {
            if (Trace.isEnabled()) {
                CLog(CLogTypes.log, LOG_TAG, 'disabling pan gestures');
            }
            this.panGestureHandler.detachFromView(chart);
        }
    }
    dispose() {
        super.dispose();
        const chart = this.mChart;
        this.panGestureHandler && this.panGestureHandler.detachFromView(chart);
        this.pinchGestureHandler && this.pinchGestureHandler.detachFromView(chart);
        this.tapGestureHandler && this.tapGestureHandler.detachFromView(chart);
        this.doubleTapGestureHandler && this.doubleTapGestureHandler.detachFromView(chart);
        this.panGestureHandler = null;
        this.pinchGestureHandler = null;
        this.tapGestureHandler = null;
        this.doubleTapGestureHandler = null;
    }
    init() {
        super.init();
        const chart = this.mChart;

        if (chart.isDoubleTapToZoomEnabled()) {
            this.setDoubleTap(true);
        }
        if (chart.isHighlightPerTapEnabled()) {
            this.setTap(true);
        }
        if (chart.isHighlightPerDragEnabled() || chart.isDragEnabled()) {
            this.setPan(true);
        }
        if (chart.isPinchZoomEnabled()) {
            this.setPinch(true);
        }
    }
    onPanGestureState(event: GestureStateEventData) {
        const chart = this.mChart;
        if (!chart.isHighlightPerDragEnabled() && !chart.isDragEnabled()) return;
        const state = event.data.state;
        switch (state) {
            // break;
            case GestureState.ACTIVE:
                this.stopDeceleration();
                this.saveTouchStart(event);
                break;
            case GestureState.END:
            case GestureState.CANCELLED:
                if (this.mTouchMode === ChartTouchListener.DRAG) {
                    this.mTouchMode = ChartTouchListener.NONE;
                    this.stopDeceleration();

                    this.mDecelerationVelocity.x = event.data.extraData.velocityX;
                    this.mDecelerationVelocity.y = event.data.extraData.velocityY;

                    chart.invalidate();
                }
                break;
        }
    }
    onPanGestureTouch(event: GestureTouchEventData) {
        const chart = this.mChart;

        if (!chart.isHighlightPerDragEnabled() && !chart.isDragEnabled()) return;

        const data = event.data;

        if (data.state !== GestureState.ACTIVE) {
            return;
        }
        if (this.mTouchMode === ChartTouchListener.DRAG) {
            if (chart.hasListeners('pan')) {
                chart.notify({ eventName: 'pan', data: event.data, object: chart });
            }
            chart.disableScroll();
            const x = event.data.extraData.translationX;
            const y = event.data.extraData.translationY;

            this.performDrag(event, x, y);
            this.mMatrix = chart.getViewPortHandler().refresh(this.mMatrix, chart, true);
        } else if (this.mTouchMode === ChartTouchListener.NONE) {
            const shouldPan = (!chart.isFullyZoomedOut() || !chart.hasNoDragOffset()) && (!chart.zoomedPanWith2Pointers || event.data.extraData.numberOfPointers === 2);

            if (shouldPan) {
                // Disable dragging in a direction that's disallowed
                if (chart.isDragXEnabled() && chart.isDragYEnabled()) {
                    chart.disableScroll();
                    this.mLastGesture = ChartGesture.DRAG;
                    this.mTouchMode = ChartTouchListener.DRAG;
                }
            } else {
                if (chart.isHighlightPerDragEnabled()) {
                    chart.disableScroll();
                    this.mLastGesture = ChartGesture.DRAG;

                    this.performHighlightDrag(event);
                }
            }
        }
    }
    onPinchGestureState(event: GestureStateEventData) {
        const chart = this.mChart;
        if (!chart.isScaleXEnabled() && !chart.isScaleYEnabled()) return;
        const state = event.data.state;
        switch (state) {
            case GestureState.ACTIVE:
                this.saveTouchStart(event);
                // get the distance between the pointers on the x-axis
                this.mSavedXDist = BarLineChartTouchListener.getXDist(event);
                chart.disableScroll();
                // get the distance between the pointers on the y-axis
                this.mSavedYDist = BarLineChartTouchListener.getYDist(event);

                if (chart.isPinchZoomEnabled()) {
                    this.mTouchMode = ChartTouchListener.PINCH_ZOOM;
                } else {
                    if (chart.isScaleXEnabled() !== chart.isScaleYEnabled()) {
                        this.mTouchMode = chart.isScaleXEnabled() ? ChartTouchListener.X_ZOOM : ChartTouchListener.Y_ZOOM;
                    } else {
                        this.mTouchMode = this.mSavedXDist > this.mSavedYDist ? ChartTouchListener.X_ZOOM : ChartTouchListener.Y_ZOOM;
                    }
                }

                // determine the touch-pointer center
                this.mTouchPointCenter.x = event.data.extraData.focalX;
                this.mTouchPointCenter.y = event.data.extraData.focalY;
                break;
            case GestureState.END:
            case GestureState.CANCELLED:
                if (
                    this.mTouchMode === ChartTouchListener.X_ZOOM ||
                    this.mTouchMode === ChartTouchListener.Y_ZOOM ||
                    this.mTouchMode === ChartTouchListener.PINCH_ZOOM ||
                    this.mTouchMode === ChartTouchListener.POST_ZOOM
                ) {
                    this.mTouchMode = ChartTouchListener.NONE;
                    // Range might have changed, which means that Y-axis labels
                    // could have changed in size, affecting Y-axis size.
                    // So we need to recalculate offsets.
                    chart.calculateOffsets();
                    chart.invalidate();
                }
                chart.enableScroll();
                break;
        }
    }
    onPinchGestureTouch(event: GestureTouchEventData) {
        const chart = this.mChart;

        if (!chart.isScaleXEnabled() && !chart.isScaleYEnabled()) return;

        if (event.data.state !== GestureState.ACTIVE) {
            return;
        }

        if (chart.hasListeners('pinch')) {
            chart.notify({ eventName: 'pinch', data: event.data, object: chart });
        }

        if (this.mTouchMode === ChartTouchListener.X_ZOOM || this.mTouchMode === ChartTouchListener.Y_ZOOM || this.mTouchMode === ChartTouchListener.PINCH_ZOOM) {
            if (this.mTouchMode === ChartTouchListener.PINCH_ZOOM) {
                this.mLastGesture = ChartGesture.PINCH_ZOOM;
                const t = this.getTrans(this.mTouchPointCenter.x, this.mTouchPointCenter.y); //focalPoint

                const scale = event.data.extraData.scale;
                const isZoomingOut = scale < 1;
                const h = chart.getViewPortHandler();

                const canZoomMoreX = isZoomingOut ? h.canZoomOutMoreX() : h.canZoomInMoreX();

                const canZoomMoreY = isZoomingOut ? h.canZoomOutMoreY() : h.canZoomInMoreY();

                const scaleX = chart.isScaleXEnabled() ? scale : 1;
                const scaleY = chart.isScaleYEnabled() ? scale : 1;

                if (canZoomMoreY || canZoomMoreX) {
                    this.mMatrix.set(this.mSavedMatrix);
                    this.mMatrix.postScale(scaleX, scaleY, t.x, t.y);
                }
                if (chart.hasListeners('zoom')) {
                    chart.notify({ eventName: 'zoom', scaleX, scaleY, ...t });
                }
            } else if (this.mTouchMode === ChartTouchListener.X_ZOOM && chart.isScaleXEnabled()) {
                this.mLastGesture = ChartGesture.X_ZOOM;
                const t = this.getTrans(this.mTouchPointCenter.x, this.mTouchPointCenter.y);

                const scaleX = event.data.extraData.scale;
                const h = chart.getViewPortHandler();

                const isZoomingOut = scaleX < 1;
                const canZoomMoreX = isZoomingOut ? h.canZoomOutMoreX() : h.canZoomInMoreX();

                if (canZoomMoreX) {
                    this.mMatrix.set(this.mSavedMatrix);
                    this.mMatrix.postScale(scaleX, 1, t.x, t.y);
                }
                if (chart.hasListeners('zoom')) {
                    chart.notify({ eventName: 'zoom', scaleX, scaleY: 1, ...t });
                }
            } else if (this.mTouchMode === ChartTouchListener.Y_ZOOM && chart.isScaleYEnabled()) {
                this.mLastGesture = ChartGesture.Y_ZOOM;
                const t = this.getTrans(this.mTouchPointCenter.x, this.mTouchPointCenter.y);
                const scaleY = event.data.extraData.scale;
                const h = chart.getViewPortHandler();

                const isZoomingOut = scaleY < 1;
                const canZoomMoreY = isZoomingOut ? h.canZoomOutMoreY() : h.canZoomInMoreY();

                if (canZoomMoreY) {
                    this.mMatrix.set(this.mSavedMatrix);
                    this.mMatrix.postScale(1, scaleY, t.x, t.y);
                }
                if (chart.hasListeners('zoom')) {
                    chart.notify({ eventName: 'zoom', scaleX: 1, scaleY, ...t });
                }
            }
            this.mMatrix = chart.getViewPortHandler().refresh(this.mMatrix, chart, true);
            // }
        }
    }

    /**
     * ################ ################ ################ ################
     */
    /** BELOW CODE PERFORMS THE ACTUAL TOUCH ACTIONS */

    /**
     * Saves the current Matrix state and the touch-start point.
     *
     * @param event
     */
    private saveTouchStart(event: GestureStateEventData) {
        this.mSavedMatrix.set(this.mMatrix);
    }

    /**
     * Performs all necessary operations needed for dragging.
     *
     * @param event
     */
    private performDrag(event, distanceX, distanceY) {
        this.mLastGesture = ChartTouchListener.DRAG;

        this.mMatrix.set(this.mSavedMatrix);

        // check if axis is inverted
        if (this.inverted()) {
            distanceY = -distanceY;
        }
        this.mMatrix.postTranslate(distanceX, distanceY);
        if (this.mChart.hasListeners('translate')) {
            this.mChart.notify({ eventName: 'translate', object: this.mChart, distanceX, distanceY });
        }
    }

    /**
     * Highlights upon dragging, generates callbacks for the selection-listener.
     *
     * @param e
     */
    private performHighlightDrag(event: GestureTouchEventData) {
        const h = this.mChart.getHighlightByTouchPoint(event.data.extraData.x, event.data.extraData.y);

        if (h != null && h !== this.mLastHighlighted) {
            this.mLastHighlighted = h;
            this.mChart.highlight(h, true);
        }
    }

    /**
     * calculates the distance on the x-axis between two pointers (fingers on
     * the display)
     *
     * @param e
     * @return
     */
    private static getXDist(e: GestureStateEventData) {
        const x = Math.abs(e.data.extraData.positions[0] - e.data.extraData.positions[2]);
        return x;
    }

    /**
     * calculates the distance on the y-axis between two pointers (fingers on
     * the display)
     *
     * @param e
     * @return
     */
    private static getYDist(e: GestureStateEventData) {
        const y = Math.abs(e.data.extraData.positions[1] - e.data.extraData.positions[3]);
        return y;
    }

    /**
     * Returns a recyclable MPPointF instance.
     * returns the correct translation depending on the provided x and y touch
     * points
     *
     * @param x
     * @param y
     * @return
     */
    public getTrans(x, y) {
        const vph = this.mChart.getViewPortHandler();

        const xTrans = x - vph.offsetLeft();
        let yTrans = 0;

        // check if axis is inverted
        if (this.inverted()) {
            yTrans = -(y - vph.offsetTop());
        } else {
            yTrans = -(vph.getChartHeight() - y - vph.offsetBottom());
        }

        return { x: xTrans, y: yTrans };
    }

    /**
     * Returns true if the current touch situation should be interpreted as inverted, false if not.
     *
     * @return
     */
    private inverted() {
        return (
            (this.mClosestDataSetToTouch == null && this.mChart.isAnyAxisInverted()) || (this.mClosestDataSetToTouch != null && this.mChart.isInverted(this.mClosestDataSetToTouch.getAxisDependency()))
        );
    }

    /**
     * ################ ################ ################ ################
     */
    /** GETTERS AND GESTURE RECOGNITION BELOW */

    /**
     * returns the matrix object the listener holds
     *
     * @return
     */
    public getMatrix() {
        return this.mMatrix;
    }

    onDoubleTapGesture(event: GestureStateEventData) {
        if (event.data.state === GestureState.END && event.data.prevState === GestureState.ACTIVE) {
            const chart = this.mChart;
            // check if double-tap zooming is enabled
            if (chart.hasListeners('doubleTap')) {
                const h = chart.getHighlightByTouchPoint(event.data.extraData.x, event.data.extraData.y);
                chart.notify({ eventName: 'doubleTap', data: event.data, object: chart, highlight: h });
            }
            if (chart.isDoubleTapToZoomEnabled() && chart.getData().getEntryCount() > 0) {
                const trans = this.getTrans(event.data.extraData.x, event.data.extraData.y);

                chart.zoom(chart.isScaleXEnabled() ? 1.4 : 1, chart.isScaleYEnabled() ? 1.4 : 1, trans.x, trans.y);

                if (Trace.isEnabled()) {
                    CLog(CLogTypes.info, LOG_TAG, 'Double-Tap, Zooming In, x: ' + trans.x + ', y: ' + trans.y);
                }
            }
        }
    }
    public onTapGesture(event: GestureStateEventData) {
        if (Trace.isEnabled()) {
            CLog(CLogTypes.log, LOG_TAG, 'onTapGesture', event.data.state, event.data.prevState);
        }
        if (event.data.state === GestureState.END && event.data.prevState === GestureState.ACTIVE) {
            this.mLastGesture = ChartGesture.SINGLE_TAP;
            const chart = this.mChart;
            const hasListener = chart.hasListeners('tap');
            const isHighlightPerTapEnabled = chart.isHighlightPerTapEnabled();
            if (!hasListener && !isHighlightPerTapEnabled) {
                return;
            }
            const h = chart.getHighlightByTouchPoint(event.data.extraData.x, event.data.extraData.y);
            if (hasListener) {
                chart.notify({ eventName: 'tap', data: event.data, object: chart, highlight: h });
            }
            if (isHighlightPerTapEnabled) {
                this.performHighlight(h);
            }
        }
    }

    public stopDeceleration() {
        this.mDecelerationVelocity.x = 0;
        this.mDecelerationVelocity.y = 0;
    }
}
