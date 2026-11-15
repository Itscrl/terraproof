import type { MonthlyPricePoint } from "./market-trends";

/**
 * Animated TerraProof Brand Icon:
 * 1. Outer mini globe continuously orbits 360° around the emblem.
 * 2. Inner sky features a Celestial Clock Wheel (Sun at 12 o'clock, Moon & Stars at 6 o'clock)
 *    that physically spins 180° like a clock across the soil horizon when switching between Daylight & Night!
 */
export function BrandIcon({ size = 34 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="terraproof-brand-svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="tp-inner-circle">
          <circle cx="100" cy="100" r="72" />
        </clipPath>
        <linearGradient id="tp-day-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
        <linearGradient id="tp-night-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#091326" />
          <stop offset="100%" stopColor="#1B2A4A" />
        </linearGradient>
      </defs>

      {/* Outer Dashed Orbit Ring */}
      <circle
        className="tp-icon-orbit-ring"
        cx="100"
        cy="100"
        r="86"
        fill="none"
        strokeWidth="4"
        strokeDasharray="9 8"
        strokeLinecap="round"
      />

      {/* Outer Mini Globe Spinning Around the Icon */}
      <g className="tp-icon-orbit-globe">
        <g transform="translate(161, 39)">
          <circle
            cx="0"
            cy="0"
            r="12"
            fill="#15803D"
            stroke="#FFFFFF"
            strokeWidth="2.2"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="5.5"
            ry="11"
            fill="none"
            stroke="#86EFAC"
            strokeWidth="1.5"
          />
          <line
            x1="-11"
            y1="0"
            x2="11"
            y2="0"
            stroke="#86EFAC"
            strokeWidth="1.5"
          />
        </g>
      </g>

      <g clipPath="url(#tp-inner-circle)">
        {/* Day & Night Sky Backdrops */}
        <rect
          className="tp-icon-sky-day"
          x="20"
          y="20"
          width="160"
          height="160"
          fill="url(#tp-day-sky)"
        />
        <rect
          className="tp-icon-sky-night"
          x="20"
          y="20"
          width="160"
          height="160"
          fill="url(#tp-night-sky)"
        />

        {/* CELESTIAL CLOCK WHEEL: Pivots at (100, 106) so Day spins to Night & Night spins to Daylight! */}
        <g className="tp-celestial-wheel">
          {/* 12 O'Clock Position: Daylight Golden Sun with Clock Rays */}
          <g className="tp-wheel-sun" transform="translate(66, 52)">
            <circle cx="0" cy="0" r="16" fill="#FDE047" opacity="0.38" />
            <circle cx="0" cy="0" r="10.5" fill="#FACC15" />
            <line x1="0" y1="-15" x2="0" y2="-19" stroke="#FACC15" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="0" y1="15" x2="0" y2="19" stroke="#FACC15" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="-15" y1="0" x2="-19" y2="0" stroke="#FACC15" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="15" y1="0" x2="19" y2="0" stroke="#FACC15" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="-11" y1="-11" x2="-14" y2="-14" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="-11" x2="14" y2="-14" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* 6 O'Clock Position (180° opposite pivot 100,106): Night Moon & Stars */}
          <g className="tp-wheel-night" transform="rotate(180 100 106)">
            <g fill="#FFFFFF">
              <circle cx="48" cy="48" r="1.8" opacity="0.95" />
              <circle cx="88" cy="40" r="1.4" opacity="0.8" />
              <circle cx="134" cy="54" r="1.7" opacity="0.9" />
              <circle cx="116" cy="42" r="1.2" opacity="0.75" />
            </g>
            <path
              d="M 60 42 A 10 10 0 1 0 74 56 A 8 8 0 1 1 60 42 Z"
              fill="#FEF08A"
            />
          </g>
        </g>

        {/* Soil Horizons & Sprout (In front of the celestial wheel so Sun/Moon rise & set behind the hills!) */}
        <path
          className="tp-icon-horizon"
          d="M 25 84 Q 100 77 175 84"
          fill="none"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 20 107 Q 100 100 180 107 L 180 180 L 20 180 Z"
          fill="#4E6E66"
        />
        <path
          d="M 20 131 Q 100 126 180 131 L 180 180 L 20 180 Z"
          fill="#825331"
        />
        <path
          d="M 20 154 Q 100 151 180 154 L 180 180 L 20 180 Z"
          fill="#47311E"
        />
        <line
          x1="100"
          y1="103"
          x2="100"
          y2="65"
          stroke="#1A3C2B"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M 100 78 C 84 79 73 70 72 56 C 86 56 97 64 100 78 Z"
          fill="#38805C"
        />
        <path
          d="M 100 71 C 103 55 114 47 128 47 C 127 62 116 71 100 71 Z"
          fill="#2A6247"
        />
      </g>
      <circle
        className="tp-icon-rim"
        cx="100"
        cy="100"
        r="72"
        fill="none"
        stroke="#1A3C2B"
        strokeWidth="6.5"
      />
    </svg>
  );
}

/**
 * Rich Botanical SVG Picture / Illustration for each of the 7 FAO Crops
 */
export function CropIllustration({
  cropId,
  size = 56,
  className,
}: {
  cropId: string;
  size?: number;
  className?: string;
}) {
  const id = cropId.toLowerCase();

  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={["crop-pic-svg", `crop-pic-${id}`, className]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={`${cropId} illustration`}
    >
      {id.includes("rice") && (
        <>
          <rect width="80" height="80" rx="16" fill="#ECFDF5" />
          {/* Paddy water ripples */}
          <path d="M14 66 Q40 61 66 66" stroke="#38BDF8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M22 72 Q40 68 58 72" stroke="#7DD3FC" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Green rice blades */}
          <path d="M40 65 Q28 44 20 28" stroke="#15803D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 65 Q52 44 62 30" stroke="#16A34A" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Golden nodding panicle */}
          <path d="M40 65 Q38 34 52 16" stroke="#CA8A04" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <ellipse cx="44" cy="24" rx="4.5" ry="2.6" transform="rotate(-30 44 24)" fill="#EAB308" />
          <ellipse cx="50" cy="19" rx="4.5" ry="2.6" transform="rotate(-25 50 19)" fill="#FACC15" />
          <ellipse cx="54" cy="25" rx="4.5" ry="2.6" transform="rotate(15 54 25)" fill="#EAB308" />
          <ellipse cx="47" cy="31" rx="4.5" ry="2.6" transform="rotate(20 47 31)" fill="#CA8A04" />
          <ellipse cx="36" cy="30" rx="4.2" ry="2.5" transform="rotate(-40 36 30)" fill="#EAB308" />
        </>
      )}

      {id.includes("maize") && (
        <>
          <rect width="80" height="80" rx="16" fill="#FEFCE8" />
          {/* Golden Corn Cob */}
          <ellipse cx="40" cy="38" rx="11" ry="22" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />
          {/* Kernel grid lines */}
          <line x1="36" y1="20" x2="36" y2="54" stroke="#CA8A04" strokeWidth="1.3" />
          <line x1="44" y1="20" x2="44" y2="54" stroke="#CA8A04" strokeWidth="1.3" />
          <line x1="31" y1="30" x2="49" y2="30" stroke="#CA8A04" strokeWidth="1.3" />
          <line x1="30" y1="38" x2="50" y2="38" stroke="#CA8A04" strokeWidth="1.3" />
          <line x1="31" y1="46" x2="49" y2="46" stroke="#CA8A04" strokeWidth="1.3" />
          {/* Green Husks */}
          <path d="M40 64 C24 58 20 38 26 24 C29 38 34 50 40 64 Z" fill="#16A34A" />
          <path d="M40 64 C56 58 60 38 54 24 C51 38 46 50 40 64 Z" fill="#15803D" />
        </>
      )}

      {id.includes("soy") && (
        <>
          <rect width="80" height="80" rx="16" fill="#F0FDF4" />
          {/* Stem & Trifoliate leaf */}
          <path d="M24 62 Q40 42 56 22" stroke="#15803D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="32" cy="26" rx="10" ry="6" transform="rotate(-25 32 26)" fill="#22C55E" />
          {/* Plump Soybean Pod */}
          <path
            d="M28 48 Q42 36 58 44 Q46 62 28 48 Z"
            fill="#84CC16"
            stroke="#15803D"
            strokeWidth="2"
          />
          <circle cx="38" cy="47" r="4" fill="#ECFCCB" />
          <circle cx="47" cy="46" r="4" fill="#ECFCCB" />
        </>
      )}

      {id.includes("groundnut") && (
        <>
          <rect width="80" height="80" rx="16" fill="#FFFBEB" />
          {/* Green Peanut Leaves */}
          <ellipse cx="28" cy="24" rx="9" ry="5.5" transform="rotate(-20 28 24)" fill="#16A34A" />
          <ellipse cx="50" cy="24" rx="9" ry="5.5" transform="rotate(20 50 24)" fill="#22C55E" />
          {/* Twin-Chamber Peanut Shell */}
          <path
            d="M24 46 C20 36 34 32 40 40 C46 32 60 38 56 50 C52 60 42 56 38 50 C32 56 26 54 24 46 Z"
            fill="#D97706"
            stroke="#92400E"
            strokeWidth="2"
          />
          <path d="M29 44 L51 47" stroke="#FEF3C7" strokeWidth="1.3" strokeDasharray="3 2" />
        </>
      )}

      {id.includes("sorghum") && (
        <>
          <rect width="80" height="80" rx="16" fill="#FEF2F2" />
          <line x1="40" y1="68" x2="40" y2="34" stroke="#15803D" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M40 58 Q24 48 18 36" stroke="#16A34A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 54 Q56 44 62 34" stroke="#15803D" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Crimson-Amber Sorghum Panicle Cluster */}
          <ellipse cx="40" cy="26" rx="11" ry="14" fill="#B45309" />
          <circle cx="36" cy="22" r="4" fill="#D97706" />
          <circle cx="44" cy="24" r="4" fill="#F59E0B" />
          <circle cx="40" cy="17" r="3.5" fill="#F59E0B" />
          <circle cx="38" cy="31" r="4" fill="#92400E" />
        </>
      )}

      {id.includes("potato") && (
        <>
          <rect width="80" height="80" rx="16" fill="#FEFCE8" />
          {/* Green Top Sprout */}
          <path d="M42 28 Q34 16 26 18" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M42 28 Q50 16 58 20" stroke="#15803D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Golden Tuber */}
          <ellipse cx="38" cy="46" rx="18" ry="13" transform="rotate(-10 38 46)" fill="#EAB308" stroke="#A16207" strokeWidth="2" />
          <ellipse cx="52" cy="54" rx="11" ry="8.5" transform="rotate(12 52 54)" fill="#CA8A04" stroke="#854D0E" strokeWidth="1.8" />
          <circle cx="32" cy="43" r="1.5" fill="#854D0E" />
          <circle cx="43" cy="48" r="1.5" fill="#854D0E" />
        </>
      )}

      {!id.includes("rice") &&
        !id.includes("maize") &&
        !id.includes("soy") &&
        !id.includes("groundnut") &&
        !id.includes("sorghum") &&
        !id.includes("potato") && (
          <>
            <rect width="80" height="80" rx="16" fill="#FFFBEB" />
            <line x1="40" y1="68" x2="40" y2="16" stroke="#CA8A04" strokeWidth="2.8" strokeLinecap="round" />
            {[22, 30, 38, 46].map((y) => (
              <g key={y}>
                <ellipse cx="34" cy={y} rx="5" ry="3" transform={`rotate(-35 34 ${y})`} fill="#EAB308" />
                <ellipse cx="46" cy={y} rx="5" ry="3" transform={`rotate(35 46 ${y})`} fill="#FACC15" />
              </g>
            ))}
          </>
        )}
    </svg>
  );
}

/**
 * Animated 12-Month Market Price & Seasonal Rainfall Story Chart
 */
export function MarketStoryChart({
  cropName,
  points,
  monthlyRainfall,
  plantingMonth,
  harvestMonths,
}: {
  cropName: string;
  points: MonthlyPricePoint[];
  monthlyRainfall: number[];
  plantingMonth: number;
  harvestMonths: number[];
}) {
  const prices = points.map((p) => p.pricePhpKg);
  const minP = Math.min(...prices) * 0.92;
  const maxP = Math.max(...prices) * 1.06;
  const maxRain = Math.max(1, ...monthlyRainfall);

  const width = 680;
  const height = 210;
  const padX = 42;
  const stepX = (width - padX * 2) / 11;

  const coords = points.map((pt, i) => {
    const x = padX + i * stepX;
    const norm = (pt.pricePhpKg - minP) / Math.max(0.1, maxP - minP);
    const y = 132 - norm * 82;
    return { ...pt, x, y, rain: monthlyRainfall[i] ?? 150 };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${coords[0].x},155 ${polyline} ${coords[coords.length - 1].x},155`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="market-story-svg"
      role="img"
      aria-label={`12-month farmgate price and rainfall trend story for ${cropName}`}
    >
      <defs>
        <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A16207" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#A16207" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <line x1={padX} y1="54" x2={width - padX} y2="54" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
      <line x1={padX} y1="104" x2={width - padX} y2="104" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
      <line x1={padX} y1="155" x2={width - padX} y2="155" stroke="currentColor" strokeOpacity="0.18" />

      {coords.map((c) => {
        const barH = Math.max(6, Math.round((c.rain / maxRain) * 44));
        const isPlanting = c.month === plantingMonth;
        const isHarvest = harvestMonths.includes(c.month);
        return (
          <g key={c.month}>
            {(isPlanting || isHarvest) && (
              <rect
                x={c.x - 18}
                y="22"
                width="36"
                height="133"
                rx="8"
                fill={isHarvest ? "#FEF08A" : "#DCFCE7"}
                fillOpacity="0.28"
              />
            )}

            <rect
              x={c.x - 9}
              y={155 - barH}
              width="18"
              height={barH}
              rx="4"
              fill={isPlanting ? "#15803D" : "#22C55E"}
              fillOpacity={isPlanting ? "0.75" : "0.32"}
            />

            <text
              x={c.x}
              y="174"
              textAnchor="middle"
              fontSize="11"
              fontWeight={isPlanting || isHarvest ? "700" : "500"}
              fill="currentColor"
              opacity={isPlanting || isHarvest ? "1" : "0.7"}
              fontFamily="Fira Code, monospace"
            >
              {c.monthShort}
            </text>

            {isPlanting && (
              <text
                x={c.x}
                y="192"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#15803D"
                fontFamily="Fira Code, monospace"
              >
                PLANT
              </text>
            )}
            {!isPlanting && isHarvest && (
              <text
                x={c.x}
                y="192"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#A16207"
                fontFamily="Fira Code, monospace"
              >
                HARVEST
              </text>
            )}
          </g>
        );
      })}

      <polygon points={areaPoints} fill="url(#priceAreaGrad)" />

      <polyline
        fill="none"
        stroke="#A16207"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
        className="svg-price-line"
      />

      {coords.map((c) => {
        const isHarvest = harvestMonths.includes(c.month);
        const isLean = c.supplyState === "lean";
        return (
          <g key={`pt-${c.month}`}>
            <circle
              cx={c.x}
              cy={c.y}
              r={isHarvest || isLean ? 5.5 : 3.5}
              fill={isHarvest ? "#A16207" : isLean ? "#15803D" : "#FFFFFF"}
              stroke="#A16207"
              strokeWidth="2"
            />
            {isHarvest && (
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#A16207"
                fontFamily="Fira Code, monospace"
              >
                HIGH DEMAND
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function SatelliteSoilGraphic() {
  return (
    <svg
      viewBox="0 0 420 270"
      className="landing-svg-graphic"
      role="img"
      aria-label="Illustration of satellite scanning a 250m farm parcel across 0 to 30cm soil depth horizons"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#DCFCE7" />
        </linearGradient>
        <linearGradient id="scanBeam" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#15803D" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="topSoil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id="midSoil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#713F12" />
          <stop offset="100%" stopColor="#854D0E" />
        </linearGradient>
        <linearGradient id="deepSoil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#422006" />
          <stop offset="100%" stopColor="#572B08" />
        </linearGradient>
      </defs>

      <rect width="420" height="270" rx="18" fill="url(#skyGrad)" />

      <path
        d="M 30 58 Q 210 8 390 58"
        fill="none"
        stroke="#86EFAC"
        strokeWidth="1.5"
        strokeDasharray="5 5"
      />

      <polygon
        points="210,44 95,145 325,145"
        fill="url(#scanBeam)"
        className="svg-pulse-slow"
      />

      <line
        x1="115"
        y1="115"
        x2="305"
        y2="115"
        stroke="#15803D"
        strokeWidth="2"
        strokeDasharray="6 4"
        className="svg-scan-line"
      />

      <g transform="translate(182, 18)" className="svg-float-slow">
        <rect x="0" y="10" width="16" height="12" rx="2" fill="#15803D" />
        <rect x="40" y="10" width="16" height="12" rx="2" fill="#15803D" />
        <line x1="16" y1="16" x2="21" y2="16" stroke="#14532D" strokeWidth="2" />
        <line x1="35" y1="16" x2="40" y2="16" stroke="#14532D" strokeWidth="2" />
        <rect x="20" y="6" width="16" height="20" rx="4" fill="#14532D" />
        <circle cx="28" cy="16" r="4" fill="#22C55E" />
        <path d="M 24 26 Q 28 32 32 26" fill="none" stroke="#A16207" strokeWidth="2" />
      </g>

      <g transform="translate(0, 6)">
        <polygon
          points="210,115 330,145 210,175 90,145"
          fill="#22C55E"
          stroke="#15803D"
          strokeWidth="2"
        />
        <line x1="150" y1="130" x2="270" y2="160" stroke="#15803D" strokeOpacity="0.45" strokeWidth="1.2" />
        <line x1="270" y1="130" x2="150" y2="160" stroke="#15803D" strokeOpacity="0.45" strokeWidth="1.2" />

        <polygon
          points="210,124 285,145 210,164 135,145"
          fill="#FEF08A"
          fillOpacity="0.28"
          stroke="#A16207"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <circle cx="210" cy="144" r="5" fill="#A16207" />
        <circle cx="210" cy="144" r="10" fill="none" stroke="#A16207" strokeWidth="1.5" className="svg-ping" />

        <polygon
          points="90,145 210,175 330,145 330,167 210,197 90,167"
          fill="url(#topSoil)"
        />
        <polygon
          points="90,167 210,197 330,167 330,192 210,222 90,192"
          fill="url(#midSoil)"
        />
        <polygon
          points="90,192 210,222 330,192 330,220 210,250 90,220"
          fill="url(#deepSoil)"
        />
      </g>

      <g transform="translate(16, 68)">
        <rect width="124" height="44" rx="10" fill="#FFFFFF" stroke="#86EFAC" strokeWidth="1.5" />
        <text x="12" y="19" fill="#14532D" fontSize="10" fontWeight="700" fontFamily="Fira Code, monospace">
          SOIL HEALTH
        </text>
        <text x="12" y="34" fill="#15803D" fontSize="11" fontWeight="600" fontFamily="Fira Sans, sans-serif">
          Fertility &amp; Balance
        </text>
      </g>

      <g transform="translate(278, 68)">
        <rect width="126" height="44" rx="10" fill="#FFFFFF" stroke="#86EFAC" strokeWidth="1.5" />
        <text x="12" y="19" fill="#A16207" fontSize="10" fontWeight="700" fontFamily="Fira Code, monospace">
          ROOT MOISTURE
        </text>
        <text x="12" y="34" fill="#14532D" fontSize="11" fontWeight="600" fontFamily="Fira Sans, sans-serif">
          Surface &amp; Deep Roots
        </text>
      </g>

      <g transform="translate(334, 166)" fontFamily="Fira Code, monospace" fontSize="10" fontWeight="600" fill="#14532D">
        <text x="0" y="0">Topsoil</text>
        <text x="0" y="25">Mid Roots</text>
        <text x="0" y="52">Subsoil</text>
      </g>
    </svg>
  );
}

export function ClimateMarketGraphic() {
  return (
    <svg
      viewBox="0 0 420 270"
      className="landing-svg-graphic"
      role="img"
      aria-label="Illustration of seasonal rain bars paired with market harvest window price curve and crop rankings"
    >
      <defs>
        <linearGradient id="marketBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F0FDF4" />
          <stop offset="100%" stopColor="#FEFCE8" />
        </linearGradient>
        <linearGradient id="rainBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      <rect width="420" height="270" rx="18" fill="url(#marketBg)" />

      <rect x="24" y="56" width="372" height="164" rx="12" fill="#FFFFFF" stroke="#BBF7D0" strokeWidth="1.5" />

      <line x1="44" y1="92" x2="376" y2="92" stroke="#E2E8F0" strokeDasharray="3 3" />
      <line x1="44" y1="132" x2="376" y2="132" stroke="#E2E8F0" strokeDasharray="3 3" />
      <line x1="44" y1="172" x2="376" y2="172" stroke="#E2E8F0" strokeDasharray="3 3" />

      {[
        { x: 56, h: 38, m: "J" },
        { x: 82, h: 46, m: "F" },
        { x: 108, h: 60, m: "M" },
        { x: 134, h: 74, m: "A" },
        { x: 160, h: 92, m: "M" },
        { x: 186, h: 105, m: "J" },
        { x: 212, h: 98, m: "J" },
        { x: 238, h: 86, m: "A" },
        { x: 264, h: 78, m: "S" },
        { x: 290, h: 64, m: "O" },
        { x: 316, h: 52, m: "N" },
        { x: 342, h: 42, m: "D" },
      ].map((bar, idx) => (
        <g key={idx}>
          <rect
            x={bar.x}
            y={196 - bar.h}
            width="16"
            height={bar.h}
            rx="4"
            fill="url(#rainBar)"
            fillOpacity={idx >= 3 && idx <= 7 ? "0.9" : "0.45"}
          />
          <text
            x={bar.x + 8}
            y="211"
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#475569"
            fontFamily="Fira Code, monospace"
          >
            {bar.m}
          </text>
        </g>
      ))}

      <path
        d="M 64 162 C 110 155, 145 140, 194 112 C 240 86, 285 74, 350 82"
        fill="none"
        stroke="#A16207"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="svg-draw-path"
      />

      <circle cx="298" cy="78" r="6" fill="#A16207" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="298" cy="78" r="12" fill="none" stroke="#A16207" strokeWidth="1.5" className="svg-ping" />

      <g transform="translate(24, 16)">
        <rect width="178" height="30" rx="8" fill="#14532D" />
        <text x="12" y="19" fill="#FFFFFF" fontSize="11" fontWeight="600" fontFamily="Fira Code, monospace">
          SEASONAL WEATHER FIT
        </text>
      </g>

      <g transform="translate(222, 16)">
        <rect width="174" height="30" rx="8" fill="#A16207" />
        <text x="12" y="19" fill="#FFFFFF" fontSize="11" fontWeight="600" fontFamily="Fira Code, monospace">
          PEAK BUYER DEMAND
        </text>
      </g>

      <g transform="translate(24, 230)">
        <rect width="372" height="28" rx="8" fill="#DCFCE7" />
        <text x="14" y="18" fill="#14532D" fontSize="11" fontWeight="600" fontFamily="Fira Sans, sans-serif">
          Matches 7 Illustrated Crops to Rainy/Dry Seasons &amp; Buyer Demand
        </text>
      </g>
    </svg>
  );
}

export function PrintableBriefGraphic() {
  return (
    <svg
      viewBox="0 0 420 270"
      className="landing-svg-graphic"
      role="img"
      aria-label="Illustration of three customizable printable field report designs with color swatches and live preview"
    >
      <defs>
        <linearGradient id="printBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#F0FDF4" />
        </linearGradient>
      </defs>

      <rect width="420" height="270" rx="18" fill="url(#printBg)" />

      <g transform="translate(54, 38) rotate(-6)">
        <rect width="190" height="200" rx="10" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
        <rect x="12" y="12" width="166" height="176" rx="6" fill="none" stroke="#15803D" strokeWidth="1.5" strokeDasharray="3 2" />
        <rect x="24" y="26" width="90" height="8" rx="4" fill="#14532D" />
        <rect x="24" y="42" width="130" height="6" rx="3" fill="#CBD5E1" />
      </g>

      <g transform="translate(168, 34) rotate(5)">
        <rect width="190" height="200" rx="10" fill="#FFFBEB" stroke="#A16207" strokeWidth="2" />
        <rect x="12" y="12" width="166" height="34" rx="6" fill="#A16207" />
        <rect x="22" y="24" width="96" height="8" rx="4" fill="#FFFFFF" />
        <rect x="16" y="58" width="76" height="42" rx="6" fill="#FEF3C7" />
        <rect x="100" y="58" width="76" height="42" rx="6" fill="#FEF3C7" />
      </g>

      <g transform="translate(110, 22)" className="svg-float-slow">
        <rect width="204" height="222" rx="12" fill="#FFFFFF" stroke="#15803D" strokeWidth="2.5" />
        <rect x="16" y="16" width="172" height="36" rx="7" fill="#14532D" />
        <text x="26" y="32" fill="#86EFAC" fontSize="8" fontWeight="700" fontFamily="Fira Code, monospace">
          TERRAPROOF BRIEF
        </text>
        <text x="26" y="44" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="Fira Sans, sans-serif">
          Visual Farm Guide
        </text>

        <rect x="16" y="62" width="52" height="34" rx="6" fill="#F0FDF4" stroke="#BBF7D0" />
        <text x="22" y="75" fill="#475569" fontSize="7" fontFamily="Fira Sans, sans-serif">BEST CROP</text>
        <text x="22" y="88" fill="#15803D" fontSize="10" fontWeight="700" fontFamily="Fira Code, monospace">Rice/Maize</text>

        <rect x="76" y="62" width="52" height="34" rx="6" fill="#F0FDF4" stroke="#BBF7D0" />
        <text x="82" y="75" fill="#475569" fontSize="7" fontFamily="Fira Sans, sans-serif">SOIL</text>
        <text x="82" y="88" fill="#14532D" fontSize="10" fontWeight="700" fontFamily="Fira Code, monospace">Healthy</text>

        <rect x="136" y="62" width="52" height="34" rx="6" fill="#FEFCE8" stroke="#FDE047" />
        <text x="142" y="75" fill="#A16207" fontSize="7" fontFamily="Fira Sans, sans-serif">MARKET</text>
        <text x="142" y="88" fill="#A16207" fontSize="10" fontWeight="700" fontFamily="Fira Code, monospace">High Demand</text>

        <rect x="16" y="106" width="172" height="14" rx="4" fill="#DCFCE7" />
        <rect x="16" y="126" width="172" height="10" rx="3" fill="#F1F5F9" />
        <rect x="16" y="142" width="172" height="10" rx="3" fill="#F1F5F9" />
        <rect x="16" y="158" width="136" height="10" rx="3" fill="#F1F5F9" />

        <g transform="translate(16, 184)">
          <circle cx="10" cy="10" r="8" fill="#15803D" />
          <circle cx="32" cy="10" r="8" fill="#A16207" />
          <circle cx="54" cy="10" r="8" fill="#0369A1" />
          <circle cx="76" cy="10" r="8" fill="#1E293B" />
          <rect x="102" y="0" width="70" height="22" rx="6" fill="#15803D" />
          <text x="137" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="Fira Code, monospace">
            PRINT PDF
          </text>
        </g>
      </g>
    </svg>
  );
}

export function WorkflowPipelineGraphic() {
  return (
    <svg
      viewBox="0 0 920 120"
      className="landing-pipeline-svg"
      role="img"
      aria-label="Visual workflow connecting Pinpoint Land, Soil and Weather Check, Crop and Market Match, and Printable Farm Story"
    >
      <defs>
        <linearGradient id="pipeLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="50%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#A16207" />
        </linearGradient>
      </defs>

      <line
        x1="120"
        y1="60"
        x2="800"
        y2="60"
        stroke="#BBF7D0"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="120"
        y1="60"
        x2="800"
        y2="60"
        stroke="url(#pipeLineGrad)"
        strokeWidth="4"
        strokeDasharray="10 8"
        className="svg-flow-dash"
      />

      <g transform="translate(24, 18)">
        <rect width="190" height="84" rx="14" fill="#FFFFFF" stroke="#15803D" strokeWidth="2" />
        <circle cx="32" cy="42" r="16" fill="#DCFCE7" />
        <text x="32" y="46" textAnchor="middle" fill="#15803D" fontSize="12" fontWeight="700" fontFamily="Fira Code, monospace">01</text>
        <text x="58" y="38" fill="#14532D" fontSize="13" fontWeight="700" fontFamily="Fira Code, monospace">Pinpoint Land</text>
        <text x="58" y="56" fill="#475569" fontSize="11" fontFamily="Fira Sans, sans-serif">Pick Town or Field</text>
      </g>

      <g transform="translate(252, 18)">
        <rect width="190" height="84" rx="14" fill="#FFFFFF" stroke="#15803D" strokeWidth="2" />
        <circle cx="32" cy="42" r="16" fill="#DCFCE7" />
        <text x="32" y="46" textAnchor="middle" fill="#15803D" fontSize="12" fontWeight="700" fontFamily="Fira Code, monospace">02</text>
        <text x="58" y="38" fill="#14532D" fontSize="13" fontWeight="700" fontFamily="Fira Code, monospace">Soil &amp; Rain</text>
        <text x="58" y="56" fill="#475569" fontSize="11" fontFamily="Fira Sans, sans-serif">Fertility &amp; Moisture</text>
      </g>

      <g transform="translate(480, 18)">
        <rect width="190" height="84" rx="14" fill="#FFFFFF" stroke="#22C55E" strokeWidth="2" />
        <circle cx="32" cy="42" r="16" fill="#DCFCE7" />
        <text x="32" y="46" textAnchor="middle" fill="#15803D" fontSize="12" fontWeight="700" fontFamily="Fira Code, monospace">03</text>
        <text x="58" y="38" fill="#14532D" fontSize="13" fontWeight="700" fontFamily="Fira Code, monospace">Crop Match</text>
        <text x="58" y="56" fill="#475569" fontSize="11" fontFamily="Fira Sans, sans-serif">Harvest &amp; Profit</text>
      </g>

      <g transform="translate(706, 18)">
        <rect width="190" height="84" rx="14" fill="#FFFFFF" stroke="#A16207" strokeWidth="2" />
        <circle cx="32" cy="42" r="16" fill="#FEF3C7" />
        <text x="32" y="46" textAnchor="middle" fill="#A16207" fontSize="12" fontWeight="700" fontFamily="Fira Code, monospace">04</text>
        <text x="58" y="38" fill="#14532D" fontSize="13" fontWeight="700" fontFamily="Fira Code, monospace">Print Guide</text>
        <text x="58" y="56" fill="#475569" fontSize="11" fontFamily="Fira Sans, sans-serif">Ready for the Field</text>
      </g>
    </svg>
  );
}

/**
 * 7. CROP SHOWCASE STRIP (Visual gallery of all 7 illustrated crops)
 */
const CROP_GALLERY_ITEMS = [
  { id: "rice_indica", name: "Indica Rice", tag: "Wet Season Staple" },
  { id: "maize", name: "Yellow Maize", tag: "Sunny Grain Cash" },
  { id: "soybean", name: "Soybean", tag: "Soil-Building Bean" },
  { id: "groundnut", name: "Groundnut", tag: "Dry Season Nut" },
  { id: "sorghum", name: "Sorghum", tag: "Drought-Hardy Grain" },
  { id: "potato", name: "Potato", tag: "Cool Highland Root" },
  { id: "wheat", name: "Wheat", tag: "Cool Dry Grain" },
];

export function CropShowcaseStrip({
  onSelectCrop,
  selectedCropId,
}: {
  onSelectCrop?: (cropId: string) => void;
  selectedCropId?: string;
}) {
  return (
    <div
      className="crop-showcase-strip"
      role="region"
      aria-label="Illustrated crops supported by TerraProof"
    >
      {CROP_GALLERY_ITEMS.map((c) => {
        const active = selectedCropId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`crop-showcase-pill ${active ? "is-active" : ""}`}
            onClick={() => onSelectCrop?.(c.id)}
          >
            <CropIllustration cropId={c.id} size={48} />
            <div className="crop-showcase-copy">
              <strong>{c.name}</strong>
              <span>{c.tag}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 8. SOIL HORIZON & ROOT ILLUSTRATION (Visual graphic explaining soil balance, organic matter & moisture)
 */
export function SoilHorizonIllustration({
  moistureLabel = "Healthy Root Moisture",
  balanceLabel = "Sweet Spot Soil Balance",
  fertilityLabel = "Rich Organic Soil",
}: {
  moistureLabel?: string;
  balanceLabel?: string;
  fertilityLabel?: string;
}) {
  return (
    <svg
      viewBox="0 0 420 132"
      className="soil-horizon-graphic-svg"
      role="img"
      aria-label={`Soil cross-section graphic showing ${balanceLabel}, ${fertilityLabel}, and ${moistureLabel}`}
    >
      <defs>
        <linearGradient id="shSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#DCFCE7" />
        </linearGradient>
        <linearGradient id="shTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#3F2E1E" />
        </linearGradient>
        <linearGradient id="shDeep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C3A16" />
          <stop offset="100%" stopColor="#3B230B" />
        </linearGradient>
      </defs>

      <rect width="420" height="132" rx="14" fill="url(#shSky)" />

      {/* Topsoil & Subsoil Waves */}
      <path
        d="M0 54 Q105 44 210 54 T420 50 L420 96 L0 96 Z"
        fill="url(#shTop)"
      />
      <path
        d="M0 90 Q115 82 215 92 T420 88 L420 132 L0 132 Z"
        fill="url(#shDeep)"
      />

      {/* Illustrated Sprouting Plants & Roots */}
      {[75, 210, 345].map((x, idx) => (
        <g key={x} transform={`translate(${x}, 50)`}>
          {/* Root fibers */}
          <path
            d="M0 2 C-4 18 -12 30 -18 44 M0 2 C2 20 8 34 15 48 M0 2 V52"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          {/* Stem & Leaves */}
          <path
            d="M0 4 V-26"
            stroke="#15803D"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M0 -10 C-14 -12 -18 -24 -8 -30 C0 -28 2 -18 0 -10 Z"
            fill="#22C55E"
          />
          <path
            d="M0 -14 C14 -16 18 -28 8 -34 C0 -32 -2 -22 0 -14 Z"
            fill="#4ADE80"
          />
          {idx === 1 && (
            <circle cx="0" cy="-34" r="5" fill="#FACC15" />
          )}
        </g>
      ))}

      {/* Water droplets in root zone */}
      {[42, 140, 275, 382].map((dx, i) => (
        <path
          key={dx}
          d={`M${dx} ${66 + (i % 2) * 14} C${dx - 4} ${72 + (i % 2) * 14} ${dx - 4} ${77 + (i % 2) * 14} ${dx} ${77 + (i % 2) * 14} C${dx + 4} ${77 + (i % 2) * 14} ${dx + 4} ${72 + (i % 2) * 14} ${dx} ${66 + (i % 2) * 14} Z`}
          fill="#38BDF8"
        />
      ))}

      {/* Visual Callout Pills in Plain Words */}
      <g transform="translate(12, 12)">
        <rect width="124" height="24" rx="12" fill="#FFFFFF" fillOpacity="0.92" />
        <circle cx="12" cy="12" r="4" fill="#16A34A" />
        <text x="21" y="15.5" fontSize="9.5" fontWeight="700" fill="#14532D" fontFamily="Fira Sans, sans-serif">
          {balanceLabel}
        </text>
      </g>

      <g transform="translate(148, 98)">
        <rect width="124" height="24" rx="12" fill="#14532D" />
        <circle cx="12" cy="12" r="4" fill="#FACC15" />
        <text x="21" y="15.5" fontSize="9.5" fontWeight="700" fill="#FFFFFF" fontFamily="Fira Sans, sans-serif">
          {fertilityLabel}
        </text>
      </g>

      <g transform="translate(284, 12)">
        <rect width="124" height="24" rx="12" fill="#FFFFFF" fillOpacity="0.92" />
        <circle cx="12" cy="12" r="4" fill="#0284C7" />
        <text x="21" y="15.5" fontSize="9.5" fontWeight="700" fill="#0C4A6E" fontFamily="Fira Sans, sans-serif">
          {moistureLabel}
        </text>
      </g>
    </svg>
  );
}

/**
 * 9. SEASON WEATHER & CROP SCENE GRAPHIC (For Market Wizard Substep 1)
 */
export function SeasonWeatherGraphic({
  rainMm = 180,
  monthName = "May",
  cropName = "Indica Rice",
}: {
  rainMm?: number;
  monthName?: string;
  cropName?: string;
}) {
  const isWet = rainMm >= 230;
  const isDry = rainMm < 145;
  const weatherWord = isWet
    ? "Monsoon Rain Season"
    : isDry
      ? "Sunny Dry-Transition"
      : "Balanced Sun & Showers";

  return (
    <svg
      viewBox="0 0 360 110"
      className="season-weather-scene-svg"
      role="img"
      aria-label={`${monthName} weather graphic: ${weatherWord} for ${cropName}`}
    >
      <defs>
        <linearGradient id="swSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isWet ? "#DBEAFE" : "#FEF9C3"} />
          <stop offset="100%" stopColor="#DCFCE7" />
        </linearGradient>
      </defs>
      <rect width="360" height="110" rx="14" fill="url(#swSky)" />

      {/* Sun */}
      <g transform="translate(46, 36)">
        <circle r="18" fill="#FDE047" opacity="0.45" />
        <circle r="12" fill="#FACC15" />
      </g>

      {/* Rain Cloud */}
      {!isDry && (
        <g transform="translate(96, 22)">
          <path
            d="M12 24 H42 A10 10 0 0 0 42 5 A13 13 0 0 0 18 2 A9 9 0 0 0 12 24 Z"
            fill="#FFFFFF"
            stroke="#93C5FD"
            strokeWidth="1.5"
          />
          <g stroke="#0284C7" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="29" x2="15" y2="37" />
            <line x1="28" y1="29" x2="25" y2="37" />
            {isWet && <line x1="38" y1="29" x2="35" y2="37" />}
          </g>
        </g>
      )}

      {/* Rolling green field */}
      <path
        d="M0 82 Q90 68 180 80 T360 74 L360 110 L0 110 Z"
        fill="#16A34A"
      />
      <path
        d="M0 94 Q110 84 210 94 T360 90 L360 110 L0 110 Z"
        fill="#14532D"
      />

      {/* Sprouts along the hill */}
      {[175, 215, 255, 295, 330].map((sx) => (
        <g key={sx} transform={`translate(${sx}, 78)`}>
          <path d="M0 4 V-14" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0 -6 C-8 -8 -10 -15 -4 -18 C0 -16 2 -10 0 -6 Z" fill="#4ADE80" />
          <path d="M0 -8 C8 -10 10 -17 4 -20 C0 -18 -2 -12 0 -8 Z" fill="#86EFAC" />
        </g>
      ))}

      {/* Plain-word label badge */}
      <g transform="translate(154, 16)">
        <rect width="192" height="38" rx="10" fill="#FFFFFF" fillOpacity="0.92" />
        <text x="12" y="16" fontSize="9.5" fontWeight="700" fill="#15803D" fontFamily="Fira Code, monospace">
          {monthName.toUpperCase()} GROWING WEATHER
        </text>
        <text x="12" y="30" fontSize="11.5" fontWeight="700" fill="#14532D" fontFamily="Fira Sans, sans-serif">
          {weatherWord}
        </text>
      </g>
    </svg>
  );
}
