import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { overloadEngine } from "../services/overload-engine";
import { motionSync } from "../services/motion-sync";
import { secureStore } from "../services/store";
import { OverloadIndex, DailyOverloadSummary } from "../types/overload";

// Define the state for our workflow
interface OverloadState {
  motionData: any;
  overloadIndex?: OverloadIndex;
  historicalData?: OverloadIndex[];
  summary?: DailyOverloadSummary;
  error?: string;
  messages: BaseMessage[];
}

// Node functions
async function fetchMotionData(state: OverloadState): Promise<Partial<OverloadState>> {
  try {
    console.log("Fetching Motion data...");
    const motionData = await motionSync.getCachedData();
    
    if (!motionData || Object.keys(motionData).length === 0) {
      return {
        ...state,
        error: "No Motion data available. Please sync first.",
        messages: [...state.messages, new HumanMessage("No Motion data found")]
      };
    }
    
    // Ensure we have at least tasks array (even if empty)
    if (!motionData.tasks) {
      motionData.tasks = [];
    }
    
    return {
      ...state,
      motionData,
      messages: [...state.messages, new HumanMessage(`Fetched ${motionData.tasks.length} tasks`)]
    };
  } catch (error) {
    return {
      ...state,
      error: `Failed to fetch Motion data: ${error}`,
      messages: [...state.messages, new HumanMessage("Failed to fetch data")]
    };
  }
}

async function calculateOverloadIndex(state: OverloadState): Promise<Partial<OverloadState>> {
  try {
    console.log("Calculating Overload Index...");
    const overloadIndex = await overloadEngine.calculateOverloadIndex();
    
    // Store in history
    secureStore.addOverloadEntry({
      timestamp: Date.now(),
      index: overloadIndex.value,
      breakdown: {
        taskLoad: overloadIndex.factors.taskLoad,
        meetingDensity: overloadIndex.factors.meetingDensity,
        contextSwitching: overloadIndex.factors.contextSwitching,
        timePressure: overloadIndex.factors.timePresure,
        complexity: overloadIndex.factors.complexity
      }
    });
    
    return {
      ...state,
      overloadIndex,
      messages: [...state.messages, new HumanMessage(`Calculated θ = ${overloadIndex.value}`)]
    };
  } catch (error) {
    return {
      ...state,
      error: `Failed to calculate index: ${error}`,
      messages: [...state.messages, new HumanMessage("Calculation failed")]
    };
  }
}

async function analyzeHistoricalTrends(state: OverloadState): Promise<Partial<OverloadState>> {
  try {
    console.log("Analyzing historical trends...");
    const history = secureStore.getOverloadHistory(7); // Last 7 days
    
    if (history.length === 0) {
      return {
        ...state,
        historicalData: [],
        messages: [...state.messages, new HumanMessage("No historical data available")]
      };
    }
    
    // Convert store format to OverloadIndex format
    const historicalData: OverloadIndex[] = history.map(entry => ({
      value: entry.index,
      timestamp: new Date(entry.timestamp),
      metrics: {
        taskCount: 0, // We don't store raw metrics in history yet
        meetingHours: 0,
        contextSwitches: 0,
        recurringIntensity: 0,
        taskComplexity: 0,
        timeFragmentation: 0
      },
      factors: {
        taskLoad: entry.breakdown.taskLoad || 0,
        meetingDensity: entry.breakdown.meetingDensity || 0,
        contextSwitching: entry.breakdown.contextSwitching || 0,
        timePresure: entry.breakdown.timePressure || 0,
        complexity: entry.breakdown.complexity || 0
      },
      confidence: 0.8
    }));
    
    return {
      ...state,
      historicalData,
      messages: [...state.messages, new HumanMessage(`Analyzed ${history.length} days of history`)]
    };
  } catch (error) {
    return {
      ...state,
      error: `Failed to analyze history: ${error}`,
      messages: [...state.messages, new HumanMessage("History analysis failed")]
    };
  }
}

async function generateDailySummary(state: OverloadState): Promise<Partial<OverloadState>> {
  try {
    console.log("Generating daily summary...");
    
    if (!state.overloadIndex || !state.motionData) {
      return {
        ...state,
        error: "Cannot generate summary without data",
        messages: [...state.messages, new HumanMessage("Insufficient data for summary")]
      };
    }
    
    const today = new Date();
    const tasks = state.motionData.tasks || [];
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    
    // Generate recommendations based on current state
    const recommendations: string[] = [];
    if (state.overloadIndex.value > 120) {
      recommendations.push("Critical overload detected. Consider canceling non-essential meetings.");
      recommendations.push("Defer low-priority tasks to tomorrow.");
    } else if (state.overloadIndex.value > 100) {
      recommendations.push("You're overloaded. Focus on high-priority tasks only.");
      recommendations.push("Take regular breaks to maintain productivity.");
    } else if (state.overloadIndex.value > 80) {
      recommendations.push("Workload is manageable but high. Stay focused.");
    } else {
      recommendations.push("Good workload balance. Keep up the great work!");
    }
    
    const summary: DailyOverloadSummary = {
      date: today,
      averageIndex: state.overloadIndex.value,
      peakIndex: state.overloadIndex.value,
      peakTime: today,
      totalTasks: tasks.length,
      completedTasks,
      meetingHours: state.overloadIndex.metrics.meetingHours,
      focusTime: 8 - state.overloadIndex.metrics.meetingHours, // Rough estimate
      recommendations
    };
    
    return {
      ...state,
      summary,
      messages: [...state.messages, new HumanMessage("Generated daily summary")]
    };
  } catch (error) {
    return {
      ...state,
      error: `Failed to generate summary: ${error}`,
      messages: [...state.messages, new HumanMessage("Summary generation failed")]
    };
  }
}

// Define the workflow
export function createOverloadWorkflow() {
  const workflow = new StateGraph<OverloadState>({
    channels: {
      motionData: {
        value: (x?: any) => x ?? null,
      },
      overloadIndex: {
        value: (x?: OverloadIndex) => x ?? null,
      },
      historicalData: {
        value: (x?: OverloadIndex[]) => x ?? [],
      },
      summary: {
        value: (x?: DailyOverloadSummary) => x ?? null,
      },
      error: {
        value: (x?: string) => x ?? null,
      },
      messages: {
        value: (x: BaseMessage[]) => x,
        default: () => [],
      },
    },
  });

  // Add nodes
  workflow.addNode("fetch_data", fetchMotionData);
  workflow.addNode("calculate_index", calculateOverloadIndex);
  workflow.addNode("analyze_history", analyzeHistoricalTrends);
  workflow.addNode("generate_summary", generateDailySummary);

  // Define edges
  workflow.addEdge("__start__", "fetch_data");
  
  // Conditional edge based on data availability
  workflow.addConditionalEdges(
    "fetch_data",
    (state) => state.error ? "end" : "calculate",
    {
      "end": END,
      "calculate": "calculate_index"
    }
  );
  
  workflow.addEdge("calculate_index", "analyze_history");
  workflow.addEdge("analyze_history", "generate_summary");
  workflow.addEdge("generate_summary", END);

  return workflow.compile();
}

// Helper function to run the workflow
export async function runOverloadAnalysis(): Promise<OverloadState> {
  const app = createOverloadWorkflow();
  
  const initialState: OverloadState = {
    motionData: null,
    messages: [new HumanMessage("Starting overload analysis...")],
  };
  
  const result = await app.invoke(initialState);
  
  // Emit event for UI update
  if (result.overloadIndex) {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('overload:index-updated', {
        index: result.overloadIndex.value,
        timestamp: result.overloadIndex.timestamp instanceof Date 
          ? result.overloadIndex.timestamp.getTime() 
          : result.overloadIndex.timestamp,
        breakdown: result.overloadIndex.factors
      });
    });
    
    // Send notification if overloaded
    const { notificationService } = await import('../services/notifications');
    await notificationService.sendOverloadAlert(result.overloadIndex.value);
  }
  
  return result;
}