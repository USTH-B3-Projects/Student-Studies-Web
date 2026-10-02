const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const app = getApps()[0] || initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'studyflow-68540',
});

module.exports = getAuth(app);
