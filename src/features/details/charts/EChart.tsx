import { BarChart, LineChart, type BarSeriesOption, type LineSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  type GridComponentOption,
  type LegendComponentOption,
  type MarkAreaComponentOption,
  type MarkLineComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/esm/core';

// Tree-shaken ECharts: register only what the dashboard uses.
echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export type ChartOption = echarts.ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | MarkAreaComponentOption
  | MarkLineComponentOption
>;

export function EChart({ option, height = 220 }: { option: ChartOption; height?: number }) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={{ animationDuration: 300, animationDurationUpdate: 200, ...option }}
      notMerge
      style={{ height, width: '100%' }}
    />
  );
}
