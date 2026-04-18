# LineMaster SSD - Induct Optimization Engine

Process Assistants (PAs) in Amazon Sub Same Day (SSD) fulfillment centers often guess the best mix of packages to induct into the system. If they send too many boxes, stowers get overwhelmed. If they send jiffies too early, bags fill up randomly, leaving no room for boxes later. 

LineMaster SSD is a simulation-based optimization engine that outputs a step-by-step "Induct Recipe", telling the PA exactly what type of cart to put on Line 1 and Line 2 throughout a 75-minute shift.

## Features & Physics Modeled

- **Discrete Event Simulation**: Runs an offline Monte Carlo simulation forecasting 75 minutes of operations in 1-minute interval "ticks".
- **Dynamic Optimization**: Evaluates transitioning between different states (`Box/Box`, `Box/Jiffy`, `Jiffy/Jiffy`) to clear maximum volume while never exceeding safe Work In Progress (WIP) bounds on the floor.
- **Premium User Dashboard**: Provides rich dynamic input controls and outputs step-by-step timelines, simulated system bag utilization charts, and live WIP overlay charts.

## Explicit Assumptions & Domain Logic

In building the operations simulation, the following explicit assumptions and operational constraints were mapped into code (`simulation.py`). If another AI or engineer works on optimizations later, they should review these to understand the boundaries of the model:

1. **Shift & Travel Time Discretization**
   - Shift duration is bound to exactly **75 minutes**, processed as seventy-five 1-minute iterations (ticks).
   - Expected travel time from belt to aisle is fixed at **3 minutes** (3 ticks) for every inducted package.

2. **Induct Rates (Static Averages)**
   - To avoid unnecessary RNG variance that obfuscates optimal strategies, human induct speed is modeled as a static average per-minute rate.
   - **Boxes**: 900 packages/hour ➔ **15 boxes/min** per active box line.
   - **Jiffies**: 1350 packages/hour ➔ **22.5 jiffies/min** per active jiffy line.

3. **Aggregate "Mega-Aisle" System Model**
   - We abstract individual aisles and assume perfect load-leveling across the facility.
   - Total System Capacity = `Active Aisles * 200 items` (representing ~18 bags per aisle).
   - System Bag Utilization = `(Total Stowed Items) / (Total System Capacity)`.

4. **Stower Base Capacity & Priorities**
   - Available stow capacity is calculated continuously per minute using Headcount aggregates: 
     - Excellent ➔ 450/hr (7.5 items/min)
     - Good ➔ ~325/hr (5.41 items/min)
     - Bad ➔ 250/hr (4.16 items/min)
   - *Logic Flow:* Stowers always stow **Boxes first** to build structural foundations in their bags. Remaining minute-capacity is spent on Jiffies.

5. **Structural Stow Penalty (The "Library Style" Constraint)**
   - If System Bag Utilization exceeds **65%**, the effective cost (time) to stow a *Box* doubles (representing a 50% drop in speed) because stowers struggle to find space. Jiffy base rates are unaffected.

6. **WIP Safety Belt Throttling**
   - Calculated Safe WIP Limit = `Total Stowers * 15 packages`.
   - If the unstowed volume on the floor (WIP) exceeds this safety limit, the logic simulates the PA pausing the belt (0 inducts for that minute). This prevents the "burial" scenario while forcing the timeline recipe to reflect realistic slowdowns.

7. **Objective Function Evaluation (Best Worst-Case Scenario)**
   - The simulation tests permutations of time variables `T1` (time spent in `State 1: Box / Box`) and `T2` (time spent in `State 2: Box / Jiffy`), transitioning finally to `State 3: Jiffy / Jiffy`.
   - The objective to minimize is `(Remaining Unstowed Volume * 1000) + Maximum_WIP`. This intentionally ensures that clearing the maximum possible volume takes absolute precedence. However, if the operation is understaffed, the model gracefully rolls the remaining volume instead of violating the WIP limits and crashing the simulation.

## Tech Stack

- **Frontend**: React via Vite (`recharts` for data visualization, pure CSS with glassmorphism aesthetics).
- **Backend**: Python API wrapper via Flask.
- **Simulation Core**: Custom Python discrete event models (`pandas`, `numpy`).

## Instructions To Setup

### 1. Prerequisites
- Python 3.10+
- Node.js & npm

### 2. Backend Setup
Navigate into the `backend` folder and start the Flask simulation server.

```bash
cd backend
python -m venv venv

# For Windows:
.\venv\Scripts\activate
# For Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*The backend API will run on `http://localhost:5000`.*

### 3. Frontend Setup
Open a new terminal and navigate into the `frontend` folder to start the React UI.

```bash
cd frontend
npm install
npm run dev
```
*The app will be accessible at `http://localhost:5173`.*

You can visit the app in your browser, enter your volume + stower headcount, and hit "Run Optimization" to generate the results recipe!
