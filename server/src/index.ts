import express from "express";
import cors from "cors";
import dashboardRouter from "./routes/dashboard.js";
import moneyInsightsRouter from "./routes/moneyInsights.js";
import transactionsRouter from "./routes/transactions.js";
import dailyPlansRouter from "./routes/dailyPlans.js";
import goalsRouter from "./routes/goals.js";
import dailyReviewsRouter from "./routes/dailyReviews.js";
import englishNotesRouter from "./routes/englishNotes.js";
import readingNotesRouter from "./routes/readingNotes.js";
import aiLearningRouter from "./routes/aiLearning.js";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/money-insights', moneyInsightsRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/daily-plans', dailyPlansRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/daily-reviews', dailyReviewsRouter);
app.use('/api/v1/english-notes', englishNotesRouter);
app.use('/api/v1/reading-notes', readingNotesRouter);
app.use('/api/v1/ai-learning', aiLearningRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
