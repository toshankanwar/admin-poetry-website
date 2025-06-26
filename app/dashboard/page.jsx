'use client';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  getDashboardStats,
  getPoemsPerYear,
  getUsersPerYear,
  getUsersPerMonth,
  getPoemsPerMonth
} from '@/lib/dashboardStats';
import {
  FaBook,
  FaUser,
  FaCalendarAlt,
  FaListAlt,
  FaChartPie,
} from 'react-icons/fa';
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";

// Helper for time/date
const useDateTime = () => {
  const [dateTime, setDateTime] = useState({
    date: "",
    time: ""
  });
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      setDateTime({
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}:${seconds}`
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  return dateTime;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const cardData = [
  {
    key: 'totalPoems',
    label: 'Total Poems',
    icon: <FaBook className="h-8 w-8" />,
    bg: 'from-purple-500 via-purple-400 to-pink-400',
  },
  {
    key: 'totalUsers',
    label: 'Total Users',
    icon: <FaUser className="h-8 w-8" />,
    bg: 'from-pink-500 via-fuchsia-500 to-purple-400',
  },
  {
    key: 'poemsThisMonth',
    label: 'Poems This Month',
    icon: <FaCalendarAlt className="h-8 w-8" />,
    bg: 'from-fuchsia-500 via-pink-400 to-purple-400',
  },
  {
    key: 'pendingRequests',
    label: 'Pending Requests',
    icon: <FaListAlt className="h-8 w-8" />,
    bg: 'from-purple-700 via-pink-500 to-fuchsia-500',
  },
  {
    key: 'poemsThisYear',
    label: 'Poems This Year',
    icon: <FaChartPie className="h-8 w-8" />,
    bg: 'from-purple-400 via-pink-400 to-fuchsia-400',
  },
  {
    key: 'usersThisYear',
    label: 'Users Joined This Year',
    icon: <FaChartPie className="h-8 w-8" />,
    bg: 'from-fuchsia-400 via-purple-400 to-pink-400',
  },
];

// Donut chart component for annual stats
const DonutChart = ({ data, label, colors }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  const radius = 60;
  const strokeWidth = 18;
  const center = 75;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center p-6">
        <svg width="150" height="150">
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
        </svg>
        <div className="text-center mt-2 text-gray-400 text-xs">No Data</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 relative">
      <svg width="150" height="150">
        {data.map((d, i) => {
          const val = d.value / total;
          const strokeDasharray = `${val * circumference} ${circumference - val * circumference}`;
          const strokeDashoffset = -cumulative * circumference;
          cumulative += val;
          return (
            <circle
              key={d.label}
              cx={center}
              cy={center}
              r={radius}
              stroke={colors[i % colors.length]}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          );
        })}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.12"
        />
      </svg>
      <div className="absolute text-xl font-bold text-purple-600 mt-[60px]">{total}</div>
      <div className="text-center mt-2 text-purple-700 font-semibold">{label}</div>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {data.map((d, i) => (
          <span key={d.label} className="flex items-center text-xs rounded px-2 py-1" style={{ backgroundColor: colors[i % colors.length], color: "#fff" }}>
            <span className="mr-1 w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#fff", opacity: 0.7 }} />
            {d.label}: {d.value}
          </span>
        ))}
      </div>
    </div>
  );
};

// MonthRingChart: Always 12 segments, color for every month, faded if value is zero.
const MonthRingChart = ({ data, label, colors, centerLabel }) => {
  const size = 240;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const segments = data.length;
  const gapAngle = 2; // degrees between months for clarity
  const arcAngle = (360 - gapAngle * segments) / segments;

  let startAngle = -90;
  const arcs = data.map((d, i) => {
    const endAngle = startAngle + arcAngle;
    const arc = {
      startAngle,
      endAngle,
      color: colors[i % colors.length],
      value: d.value,
      label: d.label,
      idx: i
    };
    startAngle = endAngle + gapAngle;
    return arc;
  });

  // Helper to get SVG arc path
  const arcPath = (r, startDeg, endDeg) => {
    const start = polarToCartesian(center, center, r, endDeg);
    const end = polarToCartesian(center, center, r, startDeg);
    const largeArcFlag = endDeg - startDeg <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };
  function polarToCartesian(cx, cy, r, deg) {
    var rad = (deg-90) * Math.PI / 180.0;
    return {
      x: cx + (r * Math.cos(rad)),
      y: cy + (r * Math.sin(rad))
    };
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative flex flex-col items-center p-6 min-w-[260px]">
      <svg width={size} height={size} style={{overflow: 'visible'}}>
        {arcs.map((arc, i) => (
          <motion.path
            key={arc.label}
            d={arcPath(radius, arc.startAngle, arc.endAngle)}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: i * 0.05 }}
            style={{
              opacity: arc.value > 0 ? 1 : 0.25, // Faded for 0 value, visible for others
              filter: "drop-shadow(0 2px 7px rgba(168,85,247,0.10))"
            }}
          />
        ))}
        {/* Faded background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.13"
        />
      </svg>
      {/* Center label and value */}
      <div className="absolute left-0 right-0 flex flex-col items-center mt-[80px] pointer-events-none select-none">
        <div className="text-3xl font-bold text-purple-700">{centerLabel}</div>
        <div className="text-xs text-purple-500 font-medium">{label}</div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-8 w-full">
        {arcs.map((arc, i) =>
          <span key={arc.label} className="flex items-center rounded px-2 py-1 text-xs font-semibold" style={{
            backgroundColor: arc.color,
            color: "#fff",
            opacity: arc.value > 0 ? 1 : 0.7
          }}>
            <span className="mr-1 w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#fff", opacity: 0.7 }} />
            {MONTH_LABELS[arc.idx]}: {arc.value}
          </span>
        )}
        {total === 0 && <span className="text-gray-400 text-xs">No Data</span>}
      </div>
    </div>
  );
};

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [poemYearDist, setPoemYearDist] = useState([]);
  const [userYearDist, setUserYearDist] = useState([]);
  const [poemMonthDist, setPoemMonthDist] = useState([]);
  const [userMonthDist, setUserMonthDist] = useState([]);
  const [selectedUserYear, setSelectedUserYear] = useState(new Date().getFullYear());
  const [selectedPoemYear, setSelectedPoemYear] = useState(new Date().getFullYear());
  const { date, time } = useDateTime();

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      setLoading(true);
      try {
        const data = await getDashboardStats();
        if (mounted) setStats(data || {});
      } catch (err) {
        if (mounted) setStats({});
      }
      setLoading(false);
    }
    fetchStats();

    async function fetchYearDist() {
      try {
        const poemDist = await getPoemsPerYear();
        const userDist = await getUsersPerYear();
        setPoemYearDist(poemDist || []);
        setUserYearDist(userDist || []);
      } catch { setPoemYearDist([]); setUserYearDist([]); }
    }
    fetchYearDist();

    async function fetchMonthDist() {
      try {
        const poemDist = await getPoemsPerMonth(selectedPoemYear);
        const userDist = await getUsersPerMonth(selectedUserYear);
        setPoemMonthDist(poemDist || []);
        setUserMonthDist(userDist || []);
      } catch {
        setPoemMonthDist([]);
        setUserMonthDist([]);
      }
    }
    fetchMonthDist();

    // Re-fetch monthly when year changes
    // eslint-disable-next-line
  }, [selectedPoemYear, selectedUserYear]);

  // Add poemsThisYear and usersThisYear to stats for cards
  const currentYear = new Date().getFullYear();
  const poemsThisYear = poemYearDist.find(d => d.label === `${currentYear}`)?.value ?? 0;
  const usersThisYear = userYearDist.find(d => d.label === `${currentYear}`)?.value ?? 0;

  const cardShow = cardData.map(cd => {
    if (cd.key === 'poemsThisYear') return { ...cd, value: poemsThisYear };
    if (cd.key === 'usersThisYear') return { ...cd, value: usersThisYear };
    return { ...cd, value: stats?.[cd.key] ?? 0 };
  });

  // Colors for donut/circular charts - purple/pink palette
  const donutColors = [
    '#a78bfa', // purple-400
    '#f472b6', // pink-400
    '#f59e42', // orange-400
    '#fbbf24', // yellow-400
    '#f472b6', // pink-400
    '#d946ef', // fuchsia-500
    '#4c1d95', // purple-900
    '#7c3aed', // violet-600
    '#6366f1', // indigo-500
    '#be185d', // rose-800
    '#eab308', // amber-500
    '#10b981', // emerald-500
  ];

  return (
    <div className="transition-all duration-300 bg-purple-50 min-h-screen p-2 sm:p-6 lg:ml-64">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <h1 className="text-3xl font-bold text-purple-700 flex items-center gap-2 pt-12 sm:pt-0 px-2 sm:px-0">
            Overview
          </h1>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              <CalendarIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-purple-800 font-medium">
                {date}
              </span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-purple-800 font-medium">
                {time}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {cardShow.map(({ key, label, icon, bg, value }, idx) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              whileHover={{
                scale: 1.045,
                boxShadow: "0 8px 32px 0 rgba(168,85,247,0.18)",
                transition: { duration: 0.16 }
              }}
              className={`
                bg-gradient-to-br ${bg}
                shadow-md rounded-2xl px-4 py-7 flex flex-col items-center
                transition-all duration-200 border-0 group
                hover:scale-105 hover:shadow-2xl hover:-translate-y-1 cursor-pointer
                min-h-[135px]
              `}
              style={{
                boxShadow:
                  '0 4px 24px 0 rgba(112,51,172,0.09), 0 1.5px 4px 0 rgba(236,72,153,0.08)'
              }}
            >
              <div className="mb-2 group-hover:scale-110 transition-transform text-white opacity-90">
                {icon}
              </div>
              <div className="text-2xl font-bold mt-1 mb-0 text-white tracking-tight min-h-[2.1rem] select-none">
                {loading
                  ? <span className="animate-pulse">...</span>
                  : value
                }
              </div>
              <div className="text-white text-sm font-medium opacity-90 mt-0.5 text-center select-none">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Donut and animated ring charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg relative flex flex-col items-center"
          >
            <h2 className="text-lg font-semibold text-purple-700 px-6 pt-6">Year-wise Poems Posted</h2>
            <DonutChart
              data={poemYearDist.filter(d => d.value > 0)}
              label="Poems / Year"
              colors={donutColors}
            />
            <div className="flex items-center justify-between px-6 mt-2 w-full">
              <h3 className="text-base font-medium text-purple-700">Monthly Distribution</h3>
              <select
                className="bg-purple-50 border border-purple-200 rounded px-2 py-1 text-purple-800"
                value={selectedPoemYear}
                onChange={e => setSelectedPoemYear(Number(e.target.value))}
              >
                {poemYearDist.map(d => (
                  <option key={d.label} value={d.label}>{d.label}</option>
                ))}
              </select>
            </div>
            <MonthRingChart
              data={MONTH_LABELS.map((label, i) => ({
                label,
                value: poemMonthDist[i]?.value ?? 0
              }))}
              label={`Poems by Month (${selectedPoemYear})`}
              colors={donutColors}
              centerLabel={poemMonthDist.reduce((sum, d) => sum + (d?.value ?? 0), 0)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg relative flex flex-col items-center"
          >
            <h2 className="text-lg font-semibold text-purple-700 px-6 pt-6">Year-wise Users Joined</h2>
            <DonutChart
              data={userYearDist.filter(d => d.value > 0)}
              label="Users / Year"
              colors={donutColors}
            />
            <div className="flex items-center justify-between px-6 mt-2 w-full">
              <h3 className="text-base font-medium text-purple-700">Monthly Distribution</h3>
              <select
                className="bg-purple-50 border border-purple-200 rounded px-2 py-1 text-purple-800"
                value={selectedUserYear}
                onChange={e => setSelectedUserYear(Number(e.target.value))}
              >
                {userYearDist.map(d => (
                  <option key={d.label} value={d.label}>{d.label}</option>
                ))}
              </select>
            </div>
            <MonthRingChart
              data={MONTH_LABELS.map((label, i) => ({
                label,
                value: userMonthDist[i]?.value ?? 0
              }))}
              label={`Users by Month (${selectedUserYear})`}
              colors={donutColors}
              centerLabel={userMonthDist.reduce((sum, d) => sum + (d?.value ?? 0), 0)}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}