// Performance monitoring utilities for constitutional compliance
// Validates response times against constitutional budgets:
// - Mood entry: <100ms
// - Data visualization: <500ms 
// - Database queries: <50ms

class PerformanceMonitor {
  constructor() {
    this.budgets = {
      MOOD_ENTRY: 100, // ms
      DATA_VISUALIZATION: 500, // ms
      DATABASE_QUERY: 50, // ms
      MEMORY_USAGE: 200 * 1024 * 1024, // 200MB in bytes
    };
    
    this.metrics = [];
  }

  startTimer(operationType) {
    return {
      operationType,
      startTime: process.hrtime.bigint(),
    };
  }

  endTimer(timer) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to ms
    
    // Store duration in timer object for validateBudget calls
    timer.duration = duration;
    
    const metric = {
      operation: timer.operationType,
      duration,
      timestamp: new Date().toISOString(),
      withinBudget: this.isWithinBudget(timer.operationType, duration),
    };
    
    this.metrics.push(metric);
    
    if (process.env.NODE_ENV !== 'test') {
      this.logPerformance(metric);
    }
    
    return metric;
  }

  isWithinBudget(operationType, duration) {
    const budget = this.budgets[operationType];
    return budget ? duration <= budget : true;
  }

  logPerformance(metric) {
    const status = metric.withinBudget ? '✓' : '⚠';
    const budget = this.budgets[metric.operation] || 'N/A';
    
    console.log(
      `${status} ${metric.operation}: ${metric.duration.toFixed(2)}ms (budget: ${budget}ms)`
    );
  }

  getMetrics() {
    return this.metrics;
  }

  validateBudget(timer, operationType) {
    // Check if a specific timer operation is within budget
    // This is called during route execution to validate performance
    const budgetMap = {
      'mood_entry': this.budgets.MOOD_ENTRY,
      'analytics': this.budgets.DATA_VISUALIZATION,
      'database': this.budgets.DATABASE_QUERY
    };
    
    const budget = budgetMap[operationType] || budgetMap[timer.operationType];
    if (!budget) return true; // No budget defined, consider valid
    
    // If timer has duration (already ended), check that
    if (timer.duration !== undefined) {
      return timer.duration <= budget;
    }
    
    // If timer is still running, calculate current duration
    const currentTime = process.hrtime.bigint();
    const currentDuration = Number(currentTime - timer.startTime) / 1000000;
    return currentDuration <= budget;
  }

  validateBudgets() {
    const violations = this.metrics.filter(m => !m.withinBudget);
    return {
      totalOperations: this.metrics.length,
      violations: violations.length,
      violationRate: violations.length / this.metrics.length,
      details: violations,
    };
  }

  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMB = usage.heapUsed / 1024 / 1024;
    const withinBudget = usage.heapUsed <= this.budgets.MEMORY_USAGE;
    
    return {
      heapUsedMB: totalMB.toFixed(2),
      withinBudget,
      budget: '200MB',
    };
  }
}

// Express middleware for automatic API endpoint monitoring
const performanceMiddleware = (operationType = 'API_REQUEST') => {
  return (req, res, next) => {
    const timer = req.app.locals.performanceMonitor.startTimer(operationType);
    
    res.on('finish', () => {
      req.app.locals.performanceMonitor.endTimer(timer);
    });
    
    next();
  };
};

module.exports = {
  PerformanceMonitor,
  performanceMiddleware,
};