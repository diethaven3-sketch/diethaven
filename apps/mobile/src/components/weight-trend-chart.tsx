import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { colors } from "@repo/ui-tokens";
import { formatDate, type AnthropometricAssessment } from "@/lib/patient-data";

const CHART_HEIGHT = 168;
const PADDING_Y = 20;
// Keeps the first and last dots from being clipped at the chart edges.
const PADDING_X = 6;

/**
 * Read-only weight trend. Takes the newest-first list the API returns and
 * plots it oldest → newest, left to right.
 */
export function WeightTrendChart({ assessments }: { assessments: AnthropometricAssessment[] }) {
  const [width, setWidth] = useState(0);

  const points = [...assessments].reverse();
  const weights = points.map((a) => a.domainData.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  // A flat series would divide by zero; pad it so the line sits mid-chart.
  const range = max - min || 1;

  const plotWidth = Math.max(width - PADDING_X * 2, 0);
  const plotted = points.map((assessment, index) => {
    const x = PADDING_X + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const ratio = (assessment.domainData.weight - min) / range;
    const y = CHART_HEIGHT - PADDING_Y - ratio * (CHART_HEIGHT - PADDING_Y * 2);
    return { x, y, id: assessment.id };
  });

  return (
    <View className="gap-2">
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: CHART_HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Line x1={0} y1={PADDING_Y} x2={width} y2={PADDING_Y} stroke="#E5E7EB" strokeWidth={1} />
            <Line
              x1={0}
              y1={CHART_HEIGHT - PADDING_Y}
              x2={width}
              y2={CHART_HEIGHT - PADDING_Y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            {plotted.length > 1 ? (
              <Polyline
                points={plotted.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {plotted.map((point, index) => (
              <Circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r={index === plotted.length - 1 ? 5 : 3.5}
                fill={index === plotted.length - 1 ? colors.secondary : colors.primary}
              />
            ))}
          </Svg>
        ) : null}

        <Text className="absolute right-0 top-0 font-body text-xs text-body">{max.toFixed(1)} kg</Text>
        {max !== min ? (
          <Text className="absolute bottom-0 right-0 font-body text-xs text-body">{min.toFixed(1)} kg</Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="font-body text-xs text-body">{formatDate(points[0].date)}</Text>
        {points.length > 1 ? (
          <Text className="font-body text-xs text-body">{formatDate(points[points.length - 1].date)}</Text>
        ) : null}
      </View>
    </View>
  );
}
