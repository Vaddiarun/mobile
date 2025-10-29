import React, { useState } from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import Svg, { Line, Path, Text as SvgText, G, Circle, Rect } from 'react-native-svg';

type DataPoint = { time: number; temperature: number; humidity: number };
type Thresholds = { tempMin: number; tempMax: number; humMin: number; humMax: number };

interface Props {
  packets: DataPoint[];
  thresholds: Thresholds | null;
  width: number;
  height: number;
}

export default function DynamicLineChart({ packets, thresholds, width, height }: Props) {
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    type: 'temp' | 'hum';
  } | null>(null);

  if (packets.length === 0) return null;

  const padding = { left: 40, right: 20, top: 20, bottom: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const tempData = packets.map((p) => p.temperature);
  const humData = packets.map((p) => p.humidity);
  const allValues = [...tempData, ...humData];
  if (thresholds) {
    allValues.push(thresholds.tempMin, thresholds.tempMax, thresholds.humMin, thresholds.humMax);
  }
  const yMin = Math.min(...allValues) - 10;
  const yMax = Math.max(...allValues) + 10;
  const yRange = yMax - yMin;

  const getX = (index: number) => padding.left + (index / (packets.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + ((yMax - value) / yRange) * chartHeight;

  const getColor = (value: number, min: number, max: number, isTemp: boolean) => {
    if (value < min || value > max) return isTemp ? '#EF4444' : '#F97316';
    if (value === min || value === max) return '#F59E0B';
    return isTemp ? '#3B82F6' : '#22C55E';
  };

  const createSegments = (data: number[], isTemp: boolean) => {
    const segments: JSX.Element[] = [];
    const min = thresholds ? (isTemp ? thresholds.tempMin : thresholds.humMin) : -Infinity;
    const max = thresholds ? (isTemp ? thresholds.tempMax : thresholds.humMax) : Infinity;

    for (let i = 0; i < data.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(data[i]);
      const x2 = getX(i + 1);
      const y2 = getY(data[i + 1]);
      const v1 = data[i];
      const v2 = data[i + 1];

      // Check if line crosses thresholds
      const crossesMin = (v1 < min && v2 >= min) || (v1 >= min && v2 < min);
      const crossesMax = (v1 <= max && v2 > max) || (v1 > max && v2 <= max);

      if (!thresholds || (!crossesMin && !crossesMax)) {
        // Simple case: no threshold crossing
        const color = getColor(v1, min, max, isTemp);
        segments.push(
          <Line
            key={`${isTemp ? 'temp' : 'hum'}-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={2}
          />
        );
      } else {
        // Complex case: line crosses threshold
        const points: Array<{ x: number; y: number; v: number }> = [{ x: x1, y: y1, v: v1 }];

        // Calculate intersection with min threshold
        if (crossesMin) {
          const t = (min - v1) / (v2 - v1);
          const xInt = x1 + t * (x2 - x1);
          const yInt = getY(min);
          points.push({ x: xInt, y: yInt, v: min });
        }

        // Calculate intersection with max threshold
        if (crossesMax) {
          const t = (max - v1) / (v2 - v1);
          const xInt = x1 + t * (x2 - x1);
          const yInt = getY(max);
          points.push({ x: xInt, y: yInt, v: max });
        }

        points.push({ x: x2, y: y2, v: v2 });
        points.sort((a, b) => a.x - a.x);

        // Draw segments between intersection points
        for (let j = 0; j < points.length - 1; j++) {
          const midValue = (points[j].v + points[j + 1].v) / 2;
          const color = getColor(midValue, min, max, isTemp);
          segments.push(
            <Line
              key={`${isTemp ? 'temp' : 'hum'}-${i}-${j}`}
              x1={points[j].x}
              y1={points[j].y}
              x2={points[j + 1].x}
              y2={points[j + 1].y}
              stroke={color}
              strokeWidth={2}
            />
          );
        }
      }
    }
    return segments;
  };

  const yTicks = Array.from({ length: 5 }, (_, i) => yMax - (yRange * i) / 4);
  const xTicks = Array.from({ length: 6 }, (_, i) => Math.floor((i / 5) * (packets.length - 1)));

  const handlePress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const threshold = 15;

    for (let i = 0; i < packets.length; i++) {
      const x = getX(i);
      const tempY = getY(packets[i].temperature);
      const humY = getY(packets[i].humidity);

      if (Math.abs(locationX - x) < threshold && Math.abs(locationY - tempY) < threshold) {
        setSelectedPoint(
          selectedPoint?.index === i && selectedPoint?.type === 'temp'
            ? null
            : { index: i, type: 'temp' }
        );
        return;
      }
      if (Math.abs(locationX - x) < threshold && Math.abs(locationY - humY) < threshold) {
        setSelectedPoint(
          selectedPoint?.index === i && selectedPoint?.type === 'hum'
            ? null
            : { index: i, type: 'hum' }
        );
        return;
      }
    }
  };

  return (
    <View>
      <TouchableWithoutFeedback onPress={handlePress}>
        <Svg width={width} height={height}>
          {/* Y-axis */}
          <Line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#666"
            strokeWidth={1}
          />
          {yTicks.map((tick, i) => {
            const y = padding.top + (i / 4) * chartHeight;
            return (
              <G key={`ytick-${i}`}>
                <Line
                  x1={padding.left - 5}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="#666"
                  strokeWidth={1}
                />
                <SvgText x={padding.left - 10} y={y + 4} fontSize={10} fill="#666" textAnchor="end">
                  {Math.round(tick)}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis */}
          <Line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#666"
            strokeWidth={1}
          />
          {xTicks.map((tickIndex, i) => {
            const x = getX(tickIndex);
            const time = new Date(packets[tickIndex].time * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <G key={`xtick-${i}`}>
                <Line
                  x1={x}
                  y1={height - padding.bottom}
                  x2={x}
                  y2={height - padding.bottom + 5}
                  stroke="#666"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={height - padding.bottom + 18}
                  fontSize={10}
                  fill="#666"
                  textAnchor="middle">
                  {time}
                </SvgText>
              </G>
            );
          })}

          {/* Limit lines */}
          {thresholds && (
            <>
              <Line
                x1={padding.left}
                y1={getY(thresholds.tempMin)}
                x2={width - padding.right}
                y2={getY(thresholds.tempMin)}
                stroke="#EF4444"
                strokeWidth={1}
                strokeDasharray="5,5"
                opacity={0.5}
              />
              <Line
                x1={padding.left}
                y1={getY(thresholds.tempMax)}
                x2={width - padding.right}
                y2={getY(thresholds.tempMax)}
                stroke="#EF4444"
                strokeWidth={1}
                strokeDasharray="5,5"
                opacity={0.5}
              />
              <Line
                x1={padding.left}
                y1={getY(thresholds.humMin)}
                x2={width - padding.right}
                y2={getY(thresholds.humMin)}
                stroke="#F97316"
                strokeWidth={1}
                strokeDasharray="5,5"
                opacity={0.5}
              />
              <Line
                x1={padding.left}
                y1={getY(thresholds.humMax)}
                x2={width - padding.right}
                y2={getY(thresholds.humMax)}
                stroke="#F97316"
                strokeWidth={1}
                strokeDasharray="5,5"
                opacity={0.5}
              />
            </>
          )}

          {/* Data lines */}
          {createSegments(tempData, true)}
          {createSegments(humData, false)}

          {/* Interactive points and bubble */}
          {selectedPoint &&
            (() => {
              const isTemp = selectedPoint.type === 'temp';
              const value = isTemp
                ? packets[selectedPoint.index].temperature
                : packets[selectedPoint.index].humidity;
              const min = thresholds ? (isTemp ? thresholds.tempMin : thresholds.humMin) : 0;
              const max = thresholds ? (isTemp ? thresholds.tempMax : thresholds.humMax) : 0;
              const color = getColor(value, min, max, isTemp);
              const x = getX(selectedPoint.index);
              const y = getY(value);
              const bubbleWidth = 70;
              const bubbleHeight = 35;
              const bubbleX = x - bubbleWidth / 2;
              const bubbleY = y - bubbleHeight - 8;
              const bubbleCenterX = bubbleX + bubbleWidth / 2;

              return (
                <G>
                  <Circle cx={x} cy={y} r={4} fill={color} stroke="white" strokeWidth={2} />
                  <Rect
                    x={bubbleX}
                    y={bubbleY}
                    width={bubbleWidth}
                    height={bubbleHeight}
                    fill={color}
                    rx={6}
                    opacity={0.95}
                  />
                  <SvgText
                    x={bubbleCenterX}
                    y={bubbleY + 14}
                    fontSize={10}
                    fill="white"
                    textAnchor="middle"
                    fontWeight="bold">
                    {isTemp ? 'Temp' : 'Humid'}
                  </SvgText>
                  <SvgText
                    x={bubbleCenterX}
                    y={bubbleY + 28}
                    fontSize={12}
                    fill="white"
                    textAnchor="middle"
                    fontWeight="bold">
                    {`${value.toFixed(1)}${isTemp ? '°C' : '%Rh'}`}
                  </SvgText>
                </G>
              );
            })()}
        </Svg>
      </TouchableWithoutFeedback>
    </View>
  );
}
