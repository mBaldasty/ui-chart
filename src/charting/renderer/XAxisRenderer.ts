import { AxisRenderer } from "./AxisRenderer";
import { XAxis, XAxisPosition } from "../components/XAxis";
import { ViewPortHandler } from "../utils/ViewPortHandler";
import { Transformer } from "../utils/Transformer";
import { Align, Canvas, Path, Style, Rect } from "nativescript-canvas";
import { Utils } from "../utils/Utils";
import { MPPointF } from "../utils/MPPointF";
import { LimitLabelPosition, LimitLine } from "../components/LimitLine";
import { profile } from "@nativescript/core/profiling/profiling";

export class XAxisRenderer extends AxisRenderer {

    protected  mXAxis: XAxis;

    constructor( viewPortHandler: ViewPortHandler,  xAxis: XAxis,  trans: Transformer) {
        super(viewPortHandler, trans, xAxis);

        this.mXAxis = xAxis;

        this.mAxisLabelPaint.setColor('black');
        this.mAxisLabelPaint.setTextAlign(Align.CENTER);
        this.mAxisLabelPaint.setTextSize(Utils.convertDpToPixel(10));
    }

    protected setupGridPaint() {
        this.mGridPaint.setColor(this.mXAxis.getGridColor());
        this.mGridPaint.setStrokeWidth(this.mXAxis.getGridLineWidth());
        this.mGridPaint.setPathEffect(this.mXAxis.getGridDashPathEffect());
    }

    
    public computeAxis( min,  max,  inverted) {

        // calculate the starting and entry polet of the y-labels (depending on
        // zoom / contentrect bounds)
        if (this.mViewPortHandler.contentWidth() > 10 && !this.mViewPortHandler.isFullyZoomedOutX()) {

            const p1 = this.mTrans.getValuesByTouchPoint(this.mViewPortHandler.contentLeft(), this.mViewPortHandler.contentTop());
            const p2 = this.mTrans.getValuesByTouchPoint(this.mViewPortHandler.contentRight(), this.mViewPortHandler.contentTop());

            if (inverted) {

                min =  p2.x;
                max =  p1.x;
            } else {

                min =  p1.x;
                max =  p2.x;
            }

            // MPPointD.recycleInstance(p1);
            // MPPointD.recycleInstance(p2);
        }

        this.computeAxisValues(min, max);
    }

    
    protected computeAxisValues( min,  max) {
        super.computeAxisValues(min, max);

        this.computeSize();
    }

    @profile
    protected computeSize() {

        let longest = this.mXAxis.getLongestLabel();

        this.mAxisLabelPaint.setTypeface(this.mXAxis.getTypeface());
        this.mAxisLabelPaint.setTextSize(this.mXAxis.getTextSize());

        const labelSize = Utils.calcTextSize(this.mAxisLabelPaint, longest);

        const labelWidth = labelSize.width;
        const labelHeight = Utils.calcTextHeight(this.mAxisLabelPaint, "Q");

        const labelRotatedSize = Utils.getSizeOfRotatedRectangleSizeByDegrees(
                labelWidth,
                labelHeight,
                this.mXAxis.getLabelRotationAngle());


        this.mXAxis.mLabelWidth = Math.round(labelWidth);
        this.mXAxis.mLabelHeight = Math.round(labelHeight);
        this.mXAxis.mLabelRotatedWidth = Math.round(labelRotatedSize.width);
        this.mXAxis.mLabelRotatedHeight = Math.round(labelRotatedSize.height);

        // FSize.recycleInstance(labelRotatedSize);
        // FSize.recycleInstance(labelSize);
    }

    
    @profile
    
    public renderAxisLabels( c:Canvas) {

        if (!this.mXAxis.isEnabled() || !this.mXAxis.isDrawLabelsEnabled())
            return;

        let yoffset = this.mXAxis.getYOffset();

        this.mAxisLabelPaint.setTypeface(this.mXAxis.getTypeface());
        this.mAxisLabelPaint.setTextSize(this.mXAxis.getTextSize());
        this.mAxisLabelPaint.setColor(this.mXAxis.getTextColor());

        const pointF = {x:0, y:0};
        if (this.mXAxis.getPosition() == XAxisPosition.TOP) {
            pointF.x = 0.5;
            pointF.y = 1.0;
            this.drawLabels(c, this.mViewPortHandler.contentTop() - yoffset, pointF);

        } else if (this.mXAxis.getPosition() == XAxisPosition.TOP_INSIDE) {
            pointF.x = 0.5;
            pointF.y = 1.0;
            this.drawLabels(c, this.mViewPortHandler.contentTop() + yoffset + this.mXAxis.mLabelRotatedHeight, pointF);

        } else if (this.mXAxis.getPosition() == XAxisPosition.BOTTOM) {
            pointF.x = 0.5;
            pointF.y = 0.0;
            this.drawLabels(c, this.mViewPortHandler.contentBottom() + yoffset, pointF);

        } else if (this.mXAxis.getPosition() == XAxisPosition.BOTTOM_INSIDE) {
            pointF.x = 0.5;
            pointF.y = 0.0;
            this.drawLabels(c, this.mViewPortHandler.contentBottom() - yoffset - this.mXAxis.mLabelRotatedHeight, pointF);

        } else { // BOTH SIDED
            pointF.x = 0.5;
            pointF.y = 1.0;
            this.drawLabels(c, this.mViewPortHandler.contentTop() - yoffset, pointF);
            pointF.x = 0.5;
            pointF.y = 0.0;
            this.drawLabels(c, this.mViewPortHandler.contentBottom() + yoffset, pointF);
        }
        // MPPointF.recycleInstance(pointF);
    }

    
    @profile
    
    public renderAxisLine( c: Canvas) {

        if (!this.mXAxis.isDrawAxisLineEnabled() || !this.mXAxis.isEnabled())
            return;

        this.mAxisLinePaint.setColor(this.mXAxis.getAxisLineColor());
        this.mAxisLinePaint.setStrokeWidth(this.mXAxis.getAxisLineWidth());
        this.mAxisLinePaint.setPathEffect(this.mXAxis.getAxisLineDashPathEffect());

        if (this.mXAxis.getPosition() == XAxisPosition.TOP
                || this.mXAxis.getPosition() == XAxisPosition.TOP_INSIDE
                || this.mXAxis.getPosition() == XAxisPosition.BOTH_SIDED) {
            c.drawLine(this.mViewPortHandler.contentLeft(),
                    this.mViewPortHandler.contentTop(), this.mViewPortHandler.contentRight(),
                    this.mViewPortHandler.contentTop(), this.mAxisLinePaint);
        }

        if (this.mXAxis.getPosition() == XAxisPosition.BOTTOM
                || this.mXAxis.getPosition() == XAxisPosition.BOTTOM_INSIDE
                || this.mXAxis.getPosition() == XAxisPosition.BOTH_SIDED) {
            c.drawLine(this.mViewPortHandler.contentLeft(),
                    this.mViewPortHandler.contentBottom(), this.mViewPortHandler.contentRight(),
                    this.mViewPortHandler.contentBottom(), this.mAxisLinePaint);
        }
    }

    /**
     * draws the x-labels on the specified y-position
     *
     * @param pos
     */
    @profile
    protected drawLabels( c: Canvas,  pos,  anchor: MPPointF) {

        const labelRotationAngleDegrees = this.mXAxis.getLabelRotationAngle();
        const centeringEnabled = this.mXAxis.isCenterAxisLabelsEnabled();

        const positions = Array.create('float', this.mXAxis.mEntryCount * 2);

        for (let i = 0; i < positions.length; i += 2) {

            // only fill x values
            if (centeringEnabled) {
                positions[i] = this.mXAxis.mCenteredEntries[i / 2];
            } else {
                positions[i] = this.mXAxis.mEntries[i / 2];
            }
        }

        this.mTrans.pointValuesToPixel(positions);

        for (let i = 0; i < positions.length; i += 2) {

            let x = positions[i];

            if (this.mViewPortHandler.isInBoundsX(x)) {

                let label = this.mXAxis.getValueFormatter().getAxisLabel(this.mXAxis.mEntries[i / 2], this.mXAxis);
                if (this.mXAxis.isAvoidFirstLastClippingEnabled()) {

                    // avoid clipping of the last
                    if (i / 2 == this.mXAxis.mEntryCount - 1 && this.mXAxis.mEntryCount > 1) {
                        let width = Utils.calcTextWidth(this.mAxisLabelPaint, label);

                        if (width > this.mViewPortHandler.offsetRight() * 2
                                && x + width > this.mViewPortHandler.getChartWidth())
                            x -= width / 2;

                        // avoid clipping of the first
                    } else if (i == 0) {

                        let width = Utils.calcTextWidth(this.mAxisLabelPaint, label);
                        x += width / 2;
                    }
                }

                this.drawLabel(c, label, x, pos, anchor, labelRotationAngleDegrees);
            }
        }
    }

    protected drawLabel( c: Canvas,  formattedLabel,  x,  y,  anchor: MPPointF,  angleDegrees) {
        Utils.drawXAxisValue(c, formattedLabel, x, y, this.mAxisLabelPaint, anchor, angleDegrees);
    }
    protected mRenderGridLinesPath = new Path();
    protected mRenderGridLinesBuffer = [];
    
    @profile
    
    public renderGridLines( c:Canvas) {

        if (!this.mXAxis.isDrawGridLinesEnabled() || !this.mXAxis.isEnabled())
            return;

        let clipRestoreCount = c.save();
        c.clipRect(this.getGridClippingRect());

        if(this.mRenderGridLinesBuffer.length != this.mAxis.mEntryCount * 2){
            this.mRenderGridLinesBuffer = [];
        }
        const positions = this.mRenderGridLinesBuffer;

        for (let i = 0; i < positions.length; i += 2) {
            positions[i] = this.mXAxis.mEntries[i / 2];
            positions[i + 1] = this.mXAxis.mEntries[i / 2];
        }

        this.mTrans.pointValuesToPixel(positions);

        this.setupGridPaint();

        const gridLinePath = this.mRenderGridLinesPath;
        gridLinePath.reset();

        for (let i = 0; i < positions.length; i += 2) {

            this.drawGridLine(c, positions[i], positions[i + 1], gridLinePath);
        }

        c.restoreToCount(clipRestoreCount);
    }

    protected mGridClippingRect = new Rect(0,0,0,0);

    public  getGridClippingRect() {
        this.mGridClippingRect.set(this.mViewPortHandler.getContentRect());
        this.mGridClippingRect.inset(-this.mAxis.getGridLineWidth(), 0);
        return this.mGridClippingRect;
    }

    /**
     * Draws the grid line at the specified position using the provided path.
     *
     * @param c
     * @param x
     * @param y
     * @param gridLinePath
     */
    @profile
    protected drawGridLine( c: Canvas,  x,  y,  gridLinePath: Path) {

        gridLinePath.moveTo(x, this.mViewPortHandler.contentBottom());
        gridLinePath.lineTo(x, this.mViewPortHandler.contentTop());

        // draw a path because lines don't support dashing on lower android versions
        c.drawPath(gridLinePath, this.mGridPaint);

        gridLinePath.reset();
    }

    protected mRenderLimitLinesBuffer = [];
    protected mLimitLineClippingRect = new Rect(0,0,0,0);

    /**
     * Draws the LimitLines associated with this axis to the screen.
     *
     * @param c
     */
    
    @profile
    
    public renderLimitLines( c: Canvas) {

        const limitLines = this.mXAxis.getLimitLines();

        if (limitLines == null || limitLines.length <= 0)
            return;

        const position = this.mRenderLimitLinesBuffer;
        position[0] = 0;
        position[1] = 0;

        for (let i = 0; i < limitLines.length; i++) {

            const l =limitLines[i];

            if (!l.isEnabled())
                continue;

            let clipRestoreCount = c.save();
            this.mLimitLineClippingRect.set(this.mViewPortHandler.getContentRect());
            this.mLimitLineClippingRect.inset(-l.getLineWidth(), 0);
            c.clipRect(this.mLimitLineClippingRect);

            position[0] = l.getLimit();
            position[1] = 0;

            this.mTrans.pointValuesToPixel(position);

            this.renderLimitLineLine(c, l, position);
            this.renderLimitLineLabel(c, l, position, 2 + l.getYOffset());

            c.restoreToCount(clipRestoreCount);
        }
    }

    private mLimitLineSegmentsBuffer = [];
    private mLimitLinePath = new Path();

    public renderLimitLineLine( c: Canvas,  limitLine: LimitLine,  position) {
        this.mLimitLineSegmentsBuffer[0] = position[0];
        this.mLimitLineSegmentsBuffer[1] = this.mViewPortHandler.contentTop();
        this.mLimitLineSegmentsBuffer[2] = position[0];
        this.mLimitLineSegmentsBuffer[3] = this.mViewPortHandler.contentBottom();

        this.mLimitLinePath.reset();
        this.mLimitLinePath.moveTo(this.mLimitLineSegmentsBuffer[0], this.mLimitLineSegmentsBuffer[1]);
        this.mLimitLinePath.lineTo(this.mLimitLineSegmentsBuffer[2], this.mLimitLineSegmentsBuffer[3]);

        this.mLimitLinePaint.setStyle(Style.STROKE);
        this.mLimitLinePaint.setColor(limitLine.getLineColor());
        this.mLimitLinePaint.setStrokeWidth(limitLine.getLineWidth());
        this.mLimitLinePaint.setPathEffect(limitLine.getDashPathEffect());

        c.drawPath(this.mLimitLinePath, this.mLimitLinePaint);
    }

    @profile
    public renderLimitLineLabel( c:Canvas,  limitLine:LimitLine,  position,  yOffset) {
        let label = limitLine.getLabel();

        // if drawing the limit-value label is enabled
        if (label != null && label !== ("")) {

            this.mLimitLinePaint.setStyle(limitLine.getTextStyle());
            this.mLimitLinePaint.setPathEffect(null);
            this.mLimitLinePaint.setColor(limitLine.getTextColor());
            this.mLimitLinePaint.setStrokeWidth(0.5);
            this.mLimitLinePaint.setTextSize(limitLine.getTextSize());


            let xOffset = limitLine.getLineWidth() + limitLine.getXOffset();

            const labelPosition = limitLine.getLabelPosition();

            if (labelPosition == LimitLabelPosition.RIGHT_TOP) {

                const labelLineHeight = Utils.calcTextHeight(this.mLimitLinePaint, label);
                this.mLimitLinePaint.setTextAlign(Align.LEFT);
                c.drawText(label, position[0] + xOffset, this.mViewPortHandler.contentTop() + yOffset + labelLineHeight,
                        this.mLimitLinePaint);
            } else if (labelPosition == LimitLabelPosition.RIGHT_BOTTOM) {

                this.mLimitLinePaint.setTextAlign(Align.LEFT);
                c.drawText(label, position[0] + xOffset, this.mViewPortHandler.contentBottom() - yOffset, this.mLimitLinePaint);
            } else if (labelPosition == LimitLabelPosition.LEFT_TOP) {

                this.mLimitLinePaint.setTextAlign(Align.RIGHT);
                const labelLineHeight = Utils.calcTextHeight(this.mLimitLinePaint, label);
                c.drawText(label, position[0] - xOffset, this.mViewPortHandler.contentTop() + yOffset + labelLineHeight,
                        this.mLimitLinePaint);
            } else {

                this.mLimitLinePaint.setTextAlign(Align.RIGHT);
                c.drawText(label, position[0] - xOffset, this.mViewPortHandler.contentBottom() - yOffset, this.mLimitLinePaint);
            }
        }
    }
}