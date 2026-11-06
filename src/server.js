const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const apiRoutes = require('./routes/api');
const referralService = require('./services/referralService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);

// Catch-all fallback for SPA
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('Unhandled server error:', err);
  } else {
    console.warn(`[Client Error ${status}]:`, err.message);
  }
  res.status(status).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

app.listen(PORT, () => {
  const refConfig = referralService.getReferralConfig();
  console.log(`================================================================`);
  console.log(`🚀 AutomaticCallingBot Server active on http://localhost:${PORT}`);
  console.log(`📌 Official Referral Link: ${refConfig.officialUrl}`);
  console.log(`🔑 Referral Code: ${refConfig.referralCode} (Protected)`);
  console.log(`🎯 Sales Objective: Introduce Go Extra Mile & Merchant Listings`);
  console.log(`🛡️  Customer-Care Guardrails & Explicit Consent Rules: ACTIVE`);
  console.log(`================================================================`);
});

module.exports = app;
