'use client'
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  getDashboardStats,
  getPoemsPerYear,
  getUsersPerYear,
  getUsersPerMonth,
  getPoemsPerMonth,
  getPoemsPerDayThisMonth,
  getUsersPerDayThisMonth,
  getPoemsPerDayThisWeek,
  getUsersPerDayThisWeek,
  getPoemsPerHourToday,
  getUsersPerHourToday,
  getTopPoemsByComments,
  getTopPoemsByCommentsAllTime,
  getMostCommentedUsers,
  getMostCommentedUsersAllTime,
  getMostActivePoets,
  getMostActivePoetsAllTime,
  getUserNamesMap
} from '@/lib/dashboardStats';
import {
  FaBook,
  FaUser,
  FaListAlt,
} from 'react-icons/fa';
import { CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const WEEK_LABELS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const useDateTime = () => {
  const [dateTime, setDateTime] = useState({ date: "", time: "" });
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
    key: 'pendingRequests',
    label: 'Pending Requests',
    icon: <FaListAlt className="h-8 w-8" />,
    bg: 'from-purple-700 via-pink-500 to-fuchsia-500',
  }
];

const chartColors = [
  "#a78bfa", "#f472b6", "#fbbf24", "#7c3aed", "#6366f1", "#be185d", "#10b981", "#eab308", "#d946ef", "#4c1d95", "#f59e42", "#f472b6", "#f472b6"
];

const ChartCard = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl shadow-lg p-4 flex flex-col min-h-[340px] mb-4"
  >
    <h2 className="text-lg font-semibold text-purple-700 mb-2">{title}</h2>
    {children}
  </motion.div>
);

// Bar graph for Top Poems by Comments
function TopPoemsBar({ poems, label, colorIdx = 0 }) {
  const data = {
    labels: poems.map(p => p.title || p.slug),
    datasets: [
      {
        label: "Comments",
        data: poems.map(p => p.commentCount ?? 0),
        backgroundColor: chartColors[colorIdx % chartColors.length],
        borderRadius: 4,
      }
    ]
  };
  const options = {
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: { grid: { color: "#f3e8ff" }, beginAtZero: true },
      y: { grid: { display: false } }
    }
  };
  return (
    <ChartCard title={label}>
      {poems.length ? (
        <Bar data={data} options={options} />
      ) : (
        <div className="text-center text-gray-400 py-8">No data</div>
      )}
    </ChartCard>
  );
}

function LeaderboardBar({ items, label, valueKey = "value", valueLabel, colorIdx = 0, userNamesMap }) {
  const data = {
    labels: items.map(
      item =>
        item.name ||
        userNamesMap?.[item.userId] ||
        item.displayName ||
        item.email ||
        item.userId ||
        "Unknown"
    ),
    datasets: [
      {
        label: valueLabel,
        data: items.map(item => item[valueKey] ?? 0),
        backgroundColor: chartColors[colorIdx % chartColors.length],
        borderRadius: 4,
      }
    ]
  };
  const options = {
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: { grid: { color: "#f3e8ff" }, beginAtZero: true },
      y: { grid: { display: false } }
    }
  };
  return (
    <ChartCard title={label}>
      {items.length ? (
        <Bar data={data} options={options} />
      ) : (
        <div className="text-center text-gray-400 py-8">No data</div>
      )}
    </ChartCard>
  );
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [currentTab, setCurrentTab] = useState('today');

  const [poemsToday, setPoemsToday] = useState([]);
  const [usersToday, setUsersToday] = useState([]);
  const [poemsWeek, setPoemsWeek] = useState([]);
  const [usersWeek, setUsersWeek] = useState([]);
  const [poemsMonth, setPoemsMonth] = useState([]);
  const [usersMonth, setUsersMonth] = useState([]);
  const [poemsYear, setPoemsYear] = useState([]);
  const [usersYear, setUsersYear] = useState([]);

  const [topPoems, setTopPoems] = useState([]);
  const [topPoemsAllTime, setTopPoemsAllTime] = useState([]);

  // Most commented users
  const [mostCommentedUsersDay, setMostCommentedUsersDay] = useState([]);
  const [mostCommentedUsersWeek, setMostCommentedUsersWeek] = useState([]);
  const [mostCommentedUsersMonth, setMostCommentedUsersMonth] = useState([]);
  const [mostCommentedUsersYear, setMostCommentedUsersYear] = useState([]);
  const [mostCommentedUsersAllTime, setMostCommentedUsersAllTime] = useState([]);
  // Most active poets
  const [mostActivePoetsDay, setMostActivePoetsDay] = useState([]);
  const [mostActivePoetsWeek, setMostActivePoetsWeek] = useState([]);
  const [mostActivePoetsMonth, setMostActivePoetsMonth] = useState([]);
  const [mostActivePoetsYear, setMostActivePoetsYear] = useState([]);
  const [mostActivePoetsAllTime, setMostActivePoetsAllTime] = useState([]);
  // UserId->Name map for user display
  const [userNamesMap, setUserNamesMap] = useState({});

  const { date, time } = useDateTime();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    async function fetchStats() {
      try {
        const data = await getDashboardStats();
        if (mounted) setStats(data || {});
      } catch {
        if (mounted) setStats({});
      }
      setLoading(false);
    }
    fetchStats();

    const fetchAllData = async () => {
      try {
        const [
          pt, ut, pw, uw, pm, um, py, uy, tpt, tpat,
          mcuDay, mcuWeek, mcuMonth, mcuYear, mcuAll,
          mapDay, mapWeek, mapMonth, mapYear, mapAll,
          usersMap
        ] = await Promise.all([
          getPoemsPerHourToday(),
          getUsersPerHourToday(),
          getPoemsPerDayThisWeek(),
          getUsersPerDayThisWeek(),
          getPoemsPerDayThisMonth(),
          getUsersPerDayThisMonth(),
          getPoemsPerMonth(new Date().getFullYear()),
          getUsersPerMonth(new Date().getFullYear()),
          getTopPoemsByComments(currentTab),
          getTopPoemsByCommentsAllTime(),
          getMostCommentedUsers('day'),
          getMostCommentedUsers('week'),
          getMostCommentedUsers('month'),
          getMostCommentedUsers('year'),
          getMostCommentedUsersAllTime(),
          getMostActivePoets('day'),
          getMostActivePoets('week'),
          getMostActivePoets('month'),
          getMostActivePoets('year'),
          getMostActivePoetsAllTime(),
          getUserNamesMap(),
        ]);
        if (!mounted) return;
        setPoemsToday(Array.isArray(pt) ? pt : []);
        setUsersToday(Array.isArray(ut) ? ut : []);
        setPoemsWeek(Array.isArray(pw) ? pw : []);
        setUsersWeek(Array.isArray(uw) ? uw : []);
        setPoemsMonth(Array.isArray(pm) ? pm : []);
        setUsersMonth(Array.isArray(um) ? um : []);
        setPoemsYear(Array.isArray(py) ? py : []);
        setUsersYear(Array.isArray(uy) ? uy : []);
        setTopPoems(Array.isArray(tpt) ? tpt : []);
        setTopPoemsAllTime(Array.isArray(tpat) ? tpat : []);
        setMostCommentedUsersDay(Array.isArray(mcuDay) ? mcuDay : []);
        setMostCommentedUsersWeek(Array.isArray(mcuWeek) ? mcuWeek : []);
        setMostCommentedUsersMonth(Array.isArray(mcuMonth) ? mcuMonth : []);
        setMostCommentedUsersYear(Array.isArray(mcuYear) ? mcuYear : []);
        setMostCommentedUsersAllTime(Array.isArray(mcuAll) ? mcuAll : []);
        setMostActivePoetsDay(Array.isArray(mapDay) ? mapDay : []);
        setMostActivePoetsWeek(Array.isArray(mapWeek) ? mapWeek : []);
        setMostActivePoetsMonth(Array.isArray(mapMonth) ? mapMonth : []);
        setMostActivePoetsYear(Array.isArray(mapYear) ? mapYear : []);
        setMostActivePoetsAllTime(Array.isArray(mapAll) ? mapAll : []);
        setUserNamesMap(usersMap || {});
      } catch {
        if (!mounted) return;
        setPoemsToday([]); setUsersToday([]); setPoemsWeek([]); setUsersWeek([]);
        setPoemsMonth([]); setUsersMonth([]); setPoemsYear([]); setUsersYear([]);
        setTopPoems([]); setTopPoemsAllTime([]);
        setMostCommentedUsersDay([]); setMostCommentedUsersWeek([]); setMostCommentedUsersMonth([]); setMostCommentedUsersYear([]); setMostCommentedUsersAllTime([]);
        setMostActivePoetsDay([]); setMostActivePoetsWeek([]); setMostActivePoetsMonth([]); setMostActivePoetsYear([]); setMostActivePoetsAllTime([]);
        setUserNamesMap({});
      }
    };
    fetchAllData();
    return () => { mounted = false; }
  }, [currentTab]);

  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const weekLabels = WEEK_LABELS;
  const now = new Date();
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dateLabels = Array.from({ length: monthDays }, (_, i) => `${i + 1}`);

  const poemsTodayData = {
    labels: hourLabels,
    datasets: [{
      label: "Poems Added",
      data: hourLabels.map((_, i) => poemsToday.find(d => d.hour === i)?.value ?? 0),
      backgroundColor: chartColors[0],
      borderRadius: 4
    }]
  };
  const usersTodayData = {
    labels: hourLabels,
    datasets: [{
      label: "Users Joined",
      data: hourLabels.map((_, i) => usersToday.find(d => d.hour === i)?.value ?? 0),
      backgroundColor: chartColors[1],
      borderRadius: 4
    }]
  };

  const poemsWeekData = {
    labels: weekLabels,
    datasets: [{
      label: "Poems Added",
      data: weekLabels.map((_, i) => poemsWeek.find(d => d.day === i)?.value ?? 0),
      backgroundColor: chartColors[0],
      borderRadius: 4
    }]
  };
  const usersWeekData = {
    labels: weekLabels,
    datasets: [{
      label: "Users Joined",
      data: weekLabels.map((_, i) => usersWeek.find(d => d.day === i)?.value ?? 0),
      backgroundColor: chartColors[1],
      borderRadius: 4
    }]
  };

  const poemsMonthData = {
    labels: dateLabels,
    datasets: [{
      label: "Poems Added",
      data: dateLabels.map((d, i) => poemsMonth.find(pm => pm.date === (i + 1))?.value ?? 0),
      backgroundColor: chartColors[0],
      borderRadius: 4
    }]
  };
  const usersMonthData = {
    labels: dateLabels,
    datasets: [{
      label: "Users Joined",
      data: dateLabels.map((d, i) => usersMonth.find(um => um.date === (i + 1))?.value ?? 0),
      backgroundColor: chartColors[1],
      borderRadius: 4
    }]
  };

  const poemsYearData = {
    labels: MONTH_LABELS,
    datasets: [{
      label: "Poems Added",
      data: MONTH_LABELS.map((label, i) => poemsYear.find(pm => Number(pm.label) === (i + 1))?.value ?? 0),
      backgroundColor: chartColors[0],
      borderRadius: 4
    }]
  };
  const usersYearData = {
    labels: MONTH_LABELS,
    datasets: [{
      label: "Users Joined",
      data: MONTH_LABELS.map((label, i) => usersYear.find(um => Number(um.label) === (i + 1))?.value ?? 0),
      backgroundColor: chartColors[1],
      borderRadius: 4
    }]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      x: { grid: { display: false }, beginAtZero: true },
      y: { grid: { color: "#f3e8ff" }, beginAtZero: true, ticks: { precision: 0 } }
    }
  };

  const tabBtnClasses = (active) =>
    `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200
    ${active
      ? "bg-purple-600 text-white shadow"
      : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`;

  // Which leaderboard bar data to use for time filter
  const timeFilterMap = {
    today: {
      mostCommentedUsers: mostCommentedUsersDay,
      mostActivePoets: mostActivePoetsDay,
      label: "Today"
    },
    week: {
      mostCommentedUsers: mostCommentedUsersWeek,
      mostActivePoets: mostActivePoetsWeek,
      label: "This Week"
    },
    month: {
      mostCommentedUsers: mostCommentedUsersMonth,
      mostActivePoets: mostActivePoetsMonth,
      label: "This Month"
    },
    year: {
      mostCommentedUsers: mostCommentedUsersYear,
      mostActivePoets: mostActivePoetsYear,
      label: "This Year"
    }
  };

  return (
    <div className="transition-all duration-300 bg-purple-50 min-h-screen p-2 sm:p-6 lg:ml-64">
      <div className="max-w-7xl mx-auto space-y-8">
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
              <span className="text-purple-800 font-medium">{date}</span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-purple-800 font-medium">{time}</span>
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cardData.map(({ key, label, icon, bg }, idx) => (
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
                  : stats?.[key] ?? 0
                }
              </div>
              <div className="text-white text-sm font-medium opacity-90 mt-0.5 text-center select-none">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Time Filter Tabs */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {[
            { key: 'today', label: 'Today (Hourwise)' },
            { key: 'week', label: 'This Week (Daywise)' },
            { key: 'month', label: 'This Month (Datewise)' },
            { key: 'year', label: 'This Year (Monthwise)' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              className={tabBtnClasses(currentTab === tab.key)}
              onClick={() => setCurrentTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bar charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Poems */}
          <ChartCard title={
            currentTab === 'today' ? "Poems Added Today (Hourwise)"
              : currentTab === 'week' ? "Poems Added This Week (Daywise)"
                : currentTab === 'month' ? "Poems Added This Month (Datewise)"
                  : "Poems Added This Year (Monthwise)"
          }>
            {currentTab === 'today' && (
              <Bar data={poemsTodayData} options={barOptions} />
            )}
            {currentTab === 'week' && (
              <Bar data={poemsWeekData} options={barOptions} />
            )}
            {currentTab === 'month' && (
              <Bar data={poemsMonthData} options={barOptions} />
            )}
            {currentTab === 'year' && (
              <Bar data={poemsYearData} options={barOptions} />
            )}
          </ChartCard>
          {/* Users */}
          <ChartCard title={
            currentTab === 'today' ? "Users Joined Today (Hourwise)"
              : currentTab === 'week' ? "Users Joined This Week (Daywise)"
                : currentTab === 'month' ? "Users Joined This Month (Datewise)"
                  : "Users Joined This Year (Monthwise)"
          }>
            {currentTab === 'today' && (
              <Bar data={usersTodayData} options={barOptions} />
            )}
            {currentTab === 'week' && (
              <Bar data={usersWeekData} options={barOptions} />
            )}
            {currentTab === 'month' && (
              <Bar data={usersMonthData} options={barOptions} />
            )}
            {currentTab === 'year' && (
              <Bar data={usersYearData} options={barOptions} />
            )}
          </ChartCard>
        </div>

        {/* Top Poems by Comments - Bar Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <TopPoemsBar poems={topPoems} label={`Top 5 Poems by Comments (${{
            today: "Today",
            week: "This Week",
            month: "This Month",
            year: "This Year"
          }[currentTab]})`} colorIdx={6} />
          <TopPoemsBar poems={topPoemsAllTime} label="Top 5 Poems by Comments (All Time)" colorIdx={7} />
        </div>

        {/* Advanced Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <LeaderboardBar
            items={timeFilterMap[currentTab].mostCommentedUsers}
            label={`Most Commented Users (${timeFilterMap[currentTab].label})`}
            valueLabel="comments"
            valueKey="commentCount"
            colorIdx={2}
            userNamesMap={userNamesMap}
          />
          <LeaderboardBar
            items={mostCommentedUsersAllTime}
            label="Most Commented Users (All Time)"
            valueLabel="comments"
            valueKey="commentCount"
            colorIdx={3}
            userNamesMap={userNamesMap}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <LeaderboardBar
            items={timeFilterMap[currentTab].mostActivePoets}
            label={`Most Active Poets (${timeFilterMap[currentTab].label})`}
            valueLabel="poems"
            valueKey="poemCount"
            colorIdx={4}
            userNamesMap={userNamesMap}
          />
          <LeaderboardBar
            items={mostActivePoetsAllTime}
            label="Most Active Poets (All Time)"
            valueLabel="poems"
            valueKey="poemCount"
            colorIdx={5}
            userNamesMap={userNamesMap}
          />
        </div>
      </div>
    </div>
  );
}