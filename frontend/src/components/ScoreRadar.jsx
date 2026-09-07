import React from 'react';

export default function ScoreRadar({ 
  scores = {
    argument_quality: 85,
    evidence_usage: 78,
    logical_consistency: 90,
    rebuttal_effectiveness: 76,
    communication_skills: 88
  },
  size = 300 
}) {
  const dimensions = [
    { key: 'argument_quality', label: 'Arg Quality (30%)' },
    { key: 'evidence_usage', label: 'Evidence (20%)' },
    { key: 'logical_consistency', label: 'Logic Rigor (20%)' },
    { key: 'rebuttal_effectiveness', label: 'Rebuttals (15%)' },
    { key: 'communication_skills', label: 'Delivery (15%)' },
  ];

  const center = size / 2;
  const radius = (size / 2) - 45;
  const total = dimensions.length;

  const getCoordinates = (index, value) => {
    const angle = (Math.PI * 2 / total) * index - (Math.PI / 2);
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Concentric polygon grid levels: 25%, 50%, 75%, 100%
  const gridLevels = [25, 50, 75, 100];

  const userPolygonPoints = dimensions.map((dim, i) => {
    const val = scores[dim.key] || 70;
    const { x, y } = getCoordinates(i, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        
        {/* Background Grids */}
        {gridLevels.map((lvl) => {
          const points = dimensions.map((_, i) => {
            const { x, y } = getCoordinates(i, lvl);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={lvl}
              points={points}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray={lvl === 100 ? "none" : "2,2"}
              opacity="0.6"
            />
          );
        })}

        {/* Radial Axis Lines */}
        {dimensions.map((dim, i) => {
          const { x, y } = getCoordinates(i, 100);
          return (
            <line
              key={dim.key}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              opacity="0.8"
            />
          );
        })}

        {/* User Data Polygon */}
        <polygon
          points={userPolygonPoints}
          fill="rgba(59, 130, 246, 0.3)"
          stroke="#3b82f6"
          strokeWidth="2.5"
          className="transition-all duration-700 ease-out"
        />

        {/* Data Points */}
        {dimensions.map((dim, i) => {
          const val = scores[dim.key] || 70;
          const { x, y } = getCoordinates(i, val);
          return (
            <g key={`point-${dim.key}`}>
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill="#60a5fa"
                stroke="#1e3a8a"
                strokeWidth="2"
                className="transition-all duration-500"
              />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="#93c5fd"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Dimension Labels */}
        {dimensions.map((dim, i) => {
          const labelCoord = getCoordinates(i, 118);
          return (
            <text
              key={`label-${dim.key}`}
              x={labelCoord.x}
              y={labelCoord.y + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#cbd5e1"
              className="select-none"
            >
              {dim.label}
            </text>
          );
        })}

      </svg>
    </div>
  );
}
