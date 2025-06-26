import { db } from './firebase';
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';

/**
 * Gets summary dashboard stats:
 * - total poems
 * - total users
 * - poems this month
 * - pending poem requests
 * - poems this year
 * - users joined this year
 */
export async function getDashboardStats() {
  try {
    const [poemSnap, userSnap, reqSnap, poemDocs, userDocs] = await Promise.all([
      getCountFromServer(collection(db, 'poems')),
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'poemRequests')),
      getDocs(collection(db, 'poems')),
      getDocs(collection(db, 'users')),
    ]);

    // Poems this month & this year
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let poemsThisMonth = 0;
    let poemsThisYear = 0;
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) {
        dt = datePosted.toDate();
      } else if (datePosted instanceof Date) {
        dt = datePosted;
      } else if (typeof datePosted === "string" || typeof datePosted === "number") {
        dt = new Date(datePosted);
      }
      if (dt && dt.getMonth() === month && dt.getFullYear() === year) poemsThisMonth++;
      if (dt && dt.getFullYear() === year) poemsThisYear++;
    });

    // Users joined this year
    let usersThisYear = 0;
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) {
        dt = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        dt = createdAt;
      } else if (typeof createdAt === "string" || typeof createdAt === "number") {
        dt = new Date(createdAt);
      }
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

/**
 * Returns array of { label: year, value: count } for poems per year.
 */
export async function getPoemsPerYear() {
  try {
    const poemDocs = await getDocs(collection(db, 'poems'));
    const yearCounts = {};
    poemDocs.forEach(doc => {
      const { datePosted } = doc.data();
      let dt;
      if (datePosted?.toDate) {
        dt = datePosted.toDate();
      } else if (datePosted instanceof Date) {
        dt = datePosted;
      } else if (typeof datePosted === "string" || typeof datePosted === "number") {
        dt = new Date(datePosted);
      }
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

/**
 * Returns array of { label: year, value: count } for users joined per year.
 */
export async function getUsersPerYear() {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    const yearCounts = {};
    userDocs.forEach(doc => {
      const { createdAt } = doc.data();
      let dt;
      if (createdAt?.toDate) {
        dt = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        dt = createdAt;
      } else if (typeof createdAt === "string" || typeof createdAt === "number") {
        dt = new Date(createdAt);
      }
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

/**
 * Returns array of { label: month (0-11), value: count } for poems in a given year.
 */
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

/**
 * Returns array of { label: month (0-11), value: count } for users joined in a given year.
 */
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