import { db } from './firebase';
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';

// --- Summary Stats ---
export async function getDashboardStats() {
  try {
    const [poemSnap, userSnap, reqSnap, poemDocs, userDocs] = await Promise.all([
      getCountFromServer(collection(db, 'poems')),
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'poemRequests')),
      getDocs(collection(db, 'poems')),
      getDocs(collection(db, 'users')),
    ]);

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let poemsThisMonth = 0;
    let poemsThisYear = 0;
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (dt && dt.getMonth() === month && dt.getFullYear() === year) poemsThisMonth++;
      if (dt && dt.getFullYear() === year) poemsThisYear++;
    });

    let usersThisYear = 0;
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) dt = createdAt.toDate();
      else if (createdAt instanceof Date) dt = createdAt;
      else if (typeof createdAt === "string" || typeof createdAt === "number") dt = new Date(createdAt);
      if (dt && dt.getFullYear() === year) usersThisYear++;
    });

    return {
      totalPoems: poemSnap.data().count ?? 0,
      totalUsers: userSnap.data().count ?? 0,
      poemsThisMonth,
      pendingRequests: reqSnap.data().count ?? 0,
      poemsThisYear,
      usersThisYear,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalPoems: 0,
      totalUsers: 0,
      poemsThisMonth: 0,
      pendingRequests: 0,
      poemsThisYear: 0,
      usersThisYear: 0,
    };
  }
}

// --- Per-Year, Per-Month, Per-Day, Per-Hour stats ---
export async function getPoemsPerYear() {
  try {
    const poemDocs = await getDocs(collection(db, 'poems'));
    const yearCounts = {};
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (dt) {
        const y = dt.getFullYear();
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });
    return Object.entries(yearCounts)
      .sort((a, b) => a[0] - b[0])
      .map(([label, value]) => ({ label: String(label), value }));
  } catch (error) {
    console.error('Error fetching poems per year:', error);
    return [];
  }
}

export async function getUsersPerYear() {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const yearCounts = {};
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) dt = createdAt.toDate();
      else if (createdAt instanceof Date) dt = createdAt;
      else if (typeof createdAt === "string" || typeof createdAt === "number") dt = new Date(createdAt);
      if (dt) {
        const y = dt.getFullYear();
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });
    return Object.entries(yearCounts)
      .sort((a, b) => a[0] - b[0])
      .map(([label, value]) => ({ label: String(label), value }));
  } catch (error) {
    console.error('Error fetching users per year:', error);
    return [];
  }
}

export async function getPoemsPerMonth(year) {
  try {
    const poemDocs = await getDocs(collection(db, 'poems'));
    const monthCounts = Array(12).fill(0);
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (dt && dt.getFullYear() === year) {
        monthCounts[dt.getMonth()]++;
      }
    });
    return monthCounts.map((value, i) => ({ label: (i + 1).toString(), value }));
  } catch (error) {
    console.error('Error fetching poems per month:', error);
    return Array(12).fill(0).map((_, i) => ({ label: (i + 1).toString(), value: 0 }));
  }
}

export async function getUsersPerMonth(year) {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const monthCounts = Array(12).fill(0);
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) dt = createdAt.toDate();
      else if (createdAt instanceof Date) dt = createdAt;
      else if (typeof createdAt === "string" || typeof createdAt === "number") dt = new Date(createdAt);
      if (dt && dt.getFullYear() === year) {
        monthCounts[dt.getMonth()]++;
      }
    });
    return monthCounts.map((value, i) => ({ label: (i + 1).toString(), value }));
  } catch (error) {
    console.error('Error fetching users per month:', error);
    return Array(12).fill(0).map((_, i) => ({ label: (i + 1).toString(), value: 0 }));
  }
}

export async function getPoemsPerDayThisMonth() {
  try {
    const poemDocs = await getDocs(collection(db, 'poems'));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayCounts = Array(daysInMonth).fill(0);
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (dt && dt.getFullYear() === year && dt.getMonth() === month) {
        dayCounts[dt.getDate() - 1]++;
      }
    });
    return dayCounts.map((value, i) => ({ date: i + 1, value }));
  } catch (error) {
    console.error('Error fetching poems per day this month:', error);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array(daysInMonth).fill(0).map((_, i) => ({ date: i + 1, value: 0 }));
  }
}

export async function getUsersPerDayThisMonth() {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayCounts = Array(daysInMonth).fill(0);
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) dt = createdAt.toDate();
      else if (createdAt instanceof Date) dt = createdAt;
      else if (typeof createdAt === "string" || typeof createdAt === "number") dt = new Date(createdAt);
      if (dt && dt.getFullYear() === year && dt.getMonth() === month) {
        dayCounts[dt.getDate() - 1]++;
      }
    });
    return dayCounts.map((value, i) => ({ date: i + 1, value }));
  } catch (error) {
    console.error('Error fetching users per day this month:', error);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array(daysInMonth).fill(0).map((_, i) => ({ date: i + 1, value: 0 }));
  }
}

export async function getPoemsPerDayThisWeek() {
  try {
    const poemDocs = await getDocs(collection(db, 'poems'));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const nowDay = now.getDay();

    const startOfWeek = new Date(year, month, today - nowDay);
    const endOfWeek = new Date(year, month, today + (6 - nowDay));
    startOfWeek.setHours(0,0,0,0);
    endOfWeek.setHours(23,59,59,999);

    const dayCounts = Array(7).fill(0);

    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (dt && dt >= startOfWeek && dt <= endOfWeek) {
        dayCounts[dt.getDay()]++;
      }
    });

    return dayCounts.map((value, i) => ({ day: i, value }));
  } catch (error) {
    console.error('Error fetching poems per day this week:', error);
    return Array(7).fill(0).map((_, i) => ({ day: i, value: 0 }));
  }
}

export async function getUsersPerDayThisWeek() {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const nowDay = now.getDay();

    const startOfWeek = new Date(year, month, today - nowDay);
    const endOfWeek = new Date(year, month, today + (6 - nowDay));
    startOfWeek.setHours(0,0,0,0);
    endOfWeek.setHours(23,59,59,999);

    const dayCounts = Array(7).fill(0);

    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) dt = createdAt.toDate();
      else if (createdAt instanceof Date) dt = createdAt;
      else if (typeof createdAt === "string" || typeof createdAt === "number") dt = new Date(createdAt);
      if (dt && dt >= startOfWeek && dt <= endOfWeek) {
        dayCounts[dt.getDay()]++;
      }
    });

    return dayCounts.map((value, i) => ({ day: i, value }));
  } catch (error) {
    console.error('Error fetching users per day this week:', error);
    return Array(7).fill(0).map((_, i) => ({ day: i, value: 0 }));
  }
}

export async function getPoemsPerHourToday() {
  try {
    const poemDocs = await getDocs(collection(db, 'poems'));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    const hourCounts = Array(24).fill(0);
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (
        dt &&
        dt.getFullYear() === year &&
        dt.getMonth() === month &&
        dt.getDate() === date
      ) {
        hourCounts[dt.getHours()]++;
      }
    });
    return hourCounts.map((value, i) => ({ hour: i, value }));
  } catch (error) {
    console.error('Error fetching poems per hour today:', error);
    return Array(24).fill(0).map((_, i) => ({ hour: i, value: 0 }));
  }
}

export async function getUsersPerHourToday() {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    const hourCounts = Array(24).fill(0);
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) dt = createdAt.toDate();
      else if (createdAt instanceof Date) dt = createdAt;
      else if (typeof createdAt === "string" || typeof createdAt === "number") dt = new Date(createdAt);
      if (
        dt &&
        dt.getFullYear() === year &&
        dt.getMonth() === month &&
        dt.getDate() === date
      ) {
        hourCounts[dt.getHours()]++;
      }
    });
    return hourCounts.map((value, i) => ({ hour: i, value }));
  } catch (error) {
    console.error('Error fetching users per hour today:', error);
    return Array(24).fill(0).map((_, i) => ({ hour: i, value: 0 }));
  }
}

// --- Top Poems by Comments ---
export async function getTopPoemsByComments(timeframe = "today") {
  try {
    const poemsSnap = await getDocs(collection(db, 'poems'));
    const commentsSnap = await getDocs(collection(db, 'comments'));
    const now = new Date();

    let filterFn;
    if (timeframe === "today") {
      filterFn = dt =>
        dt.getFullYear() === now.getFullYear() &&
        dt.getMonth() === now.getMonth() &&
        dt.getDate() === now.getDate();
    } else if (timeframe === "week") {
      const nowDay = now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - nowDay);
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - nowDay));
      startOfWeek.setHours(0,0,0,0);
      endOfWeek.setHours(23,59,59,999);
      filterFn = dt => dt >= startOfWeek && dt <= endOfWeek;
    } else if (timeframe === "month") {
      filterFn = dt =>
        dt.getFullYear() === now.getFullYear() &&
        dt.getMonth() === now.getMonth();
    } else if (timeframe === "year") {
      filterFn = dt =>
        dt.getFullYear() === now.getFullYear();
    } else {
      filterFn = () => true;
    }

    const poemInfo = {};
    poemsSnap.forEach(doc => {
      const { slug, title } = doc.data();
      poemInfo[slug] = { title, commentCount: 0 };
    });

    commentsSnap.forEach(doc => {
      const { poemSlug, timestamp } = doc.data();
      let dt;
      if (timestamp?.toDate) dt = timestamp.toDate();
      else if (timestamp instanceof Date) dt = timestamp;
      else if (typeof timestamp === "string" || typeof timestamp === "number") dt = new Date(timestamp);
      if (!dt) return;
      if (poemSlug && poemInfo[poemSlug] && filterFn(dt)) {
        poemInfo[poemSlug].commentCount++;
      }
    });

    return Object.entries(poemInfo)
      .map(([slug, { title, commentCount }]) => ({ slug, title, commentCount }))
      .filter(p => p.commentCount > 0)
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 5);
  } catch (error) {
    console.error('Error fetching top poems by comments:', error);
    return [];
  }
}

export async function getTopPoemsByCommentsAllTime() {
  return getTopPoemsByComments("all");
}

// --- Most Commented Users, by timeframe and all time ---
function getTimeframeFilterFn(timeframe) {
  const now = new Date();
  if (timeframe === "day" || timeframe === "today") {
    return dt =>
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate();
  } else if (timeframe === "week") {
    const nowDay = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - nowDay);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - nowDay));
    startOfWeek.setHours(0,0,0,0);
    endOfWeek.setHours(23,59,59,999);
    return dt => dt >= startOfWeek && dt <= endOfWeek;
  } else if (timeframe === "month") {
    return dt =>
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth();
  } else if (timeframe === "year") {
    return dt =>
      dt.getFullYear() === now.getFullYear();
  }
  return () => true;
}

export async function getMostCommentedUsers(timeframe = "day", limit = 5) {
  try {
    const commentsSnap = await getDocs(collection(db, 'comments'));
    const userDocs = await getDocs(collection(db, 'users'));
    const userNamesMap = {};
    userDocs.forEach(doc => {
      const data = doc.data();
      if (data.userId || doc.id) {
        userNamesMap[data.userId || doc.id] = data.name || data.displayName || data.email || doc.id;
      }
    });

    const filterFn = getTimeframeFilterFn(timeframe);

    const userCounts = {};
    commentsSnap.forEach(doc => {
      const { timestamp, userId, email, name } = doc.data();
      let dt;
      if (timestamp?.toDate) dt = timestamp.toDate();
      else if (timestamp instanceof Date) dt = timestamp;
      else if (typeof timestamp === "string" || typeof timestamp === "number") dt = new Date(timestamp);
      if (!dt || !filterFn(dt)) return;
      const key = userId || email || name || 'Unknown';
      if (!userCounts[key]) userCounts[key] = { commentCount: 0, email, name, userId: key };
      userCounts[key].commentCount++;
      if (!userCounts[key].displayName && userNamesMap[key]) {
        userCounts[key].displayName = userNamesMap[key];
      }
    });
    return Object.values(userCounts)
      .map(u => ({
        ...u,
        name: u.name || u.displayName || userNamesMap[u.userId] || u.email || u.userId || "Unknown"
      }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching most commented users:', error);
    return [];
  }
}

export async function getMostCommentedUsersAllTime(limit = 5) {
  return getMostCommentedUsers("all", limit);
}

// --- Most Active Poets, by timeframe and all time ---
export async function getMostActivePoets(timeframe = "day", limit = 5) {
  try {
    const poemsSnap = await getDocs(collection(db, 'poems'));
    const userDocs = await getDocs(collection(db, 'users'));
    const userNamesMap = {};
    userDocs.forEach(doc => {
      const data = doc.data();
      if (data.userId || doc.id) {
        userNamesMap[data.userId || doc.id] = data.name || data.displayName || data.email || doc.id;
      }
    });

    const filterFn = getTimeframeFilterFn(timeframe);

    const userCounts = {};
    poemsSnap.forEach(doc => {
      const { datePosted, author, userId, email, name } = doc.data();
      let dt;
      if (datePosted?.toDate) dt = datePosted.toDate();
      else if (datePosted instanceof Date) dt = datePosted;
      else if (typeof datePosted === "string" || typeof datePosted === "number") dt = new Date(datePosted);
      if (!dt || !filterFn(dt)) return;
      const key = userId || email || name || author || 'Unknown';
      if (!userCounts[key]) userCounts[key] = { poemCount: 0, email, name: name || author, userId: key };
      userCounts[key].poemCount++;
      if (!userCounts[key].displayName && userNamesMap[key]) {
        userCounts[key].displayName = userNamesMap[key];
      }
    });
    return Object.values(userCounts)
      .map(u => ({
        ...u,
        name: u.name || u.displayName || userNamesMap[u.userId] || u.email || u.userId || "Unknown"
      }))
      .sort((a, b) => b.poemCount - a.poemCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching most active poets:', error);
    return [];
  }
}

export async function getMostActivePoetsAllTime(limit = 5) {
  return getMostActivePoets("all", limit);
}

// --- Utility: UserId -> Name map for client-side display ---
export async function getUserNamesMap() {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const userNamesMap = {};
    userDocs.forEach(doc => {
      const data = doc.data();
      if (data.userId || doc.id) {
        userNamesMap[data.userId || doc.id] = data.name || data.displayName || data.email || doc.id;
      }
    });
    return userNamesMap;
  } catch (error) {
    console.error('Error fetching user names map:', error);
    return {};
  }
}