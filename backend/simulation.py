import pandas as pd
import numpy as np

def run_simulation(total_b, total_j, e, g, b, aisles):
    # Constants and limits
    # Rates per min
    # Excellent = 450/hr = 7.5
    # Good = 325/hr = 5.416
    # Bad = 250/hr = 4.166
    C = e * 7.5 + g * (325/60.0) + b * (250/60.0)
    system_cap = aisles * 200 # 18 bags * ~11 pkgs, around 200 as requested
    stowers = e + g + b
    safe_wip = stowers * 15 # 15 items per stower safe wip limit
    if safe_wip == 0:
        safe_wip = 50
        
    best_obj = float('inf')
    best_result = None
    
    # We test every T1 and T2 for T1 <= T2 <= 75
    # T1 = minute we switch from State 1 to 2
    # T2 = minute we switch from State 2 to 3
    # State 1: Box / Box
    # State 2: Box / Jiffy
    # State 3: Jiffy / Jiffy
    for T1 in range(76):
        for T2 in range(T1, 76):
            obj, res = simulate_scenario(T1, T2, total_b, total_j, C, system_cap, safe_wip)
            if obj < best_obj:
                best_obj = obj
                best_result = res
                
    return best_result

def simulate_scenario(T1, T2, total_b, total_j, C, system_cap, safe_wip):
    hist = []
    rem_b, rem_j = total_b, total_j
    
    belt = [] # list of dictionaries {'b': x, 'j': y, 'timer': 3}
    floor_b = 0
    floor_j = 0
    stowed_b = 0
    stowed_j = 0
    max_wip = 0
    
    for t in range(75):
        # Determine State
        if t < T1:
            state = 1
        elif t < T2:
            state = 2
        else:
            state = 3
            
        rate_l1_b = 15.0 if state in [1, 2] else 0.0
        rate_l1_j = 22.5 if state == 3 else 0.0
        rate_l2_b = 15.0 if state == 1 else 0.0
        rate_l2_j = 22.5 if state in [2, 3] else 0.0
        
        # Add to belt (subject to throttle and remaining)
        wip_current = floor_b + floor_j
        if wip_current > safe_wip:
            induct_b = 0.0
            induct_j = 0.0
        else:
            induct_b = rate_l1_b + rate_l2_b
            induct_j = rate_l1_j + rate_l2_j
            
            # Constrain by remaining
            induct_b = min(induct_b, rem_b)
            rem_b -= induct_b
            induct_j = min(induct_j, rem_j)
            rem_j -= induct_j
            
        belt.append({'b': induct_b, 'j': induct_j, 'timer': 3})
        
        # Advance belt
        arrived_b = 0.0
        arrived_j = 0.0
        for item in belt:
            item['timer'] -= 1
            if item['timer'] <= 0:
                arrived_b += item['b']
                arrived_j += item['j']
        belt = [x for x in belt if x['timer'] > 0]
        
        floor_b += arrived_b
        floor_j += arrived_j
        wip_current = floor_b + floor_j
        
        if wip_current > max_wip:
            max_wip = wip_current
            
        # Stow logic
        util = (stowed_b + stowed_j) / system_cap
        cost_box = 2.0 if util > 0.65 else 1.0
        
        K = C
        sb = min(floor_b, K / cost_box)
        K -= sb * cost_box
        sj = min(floor_j, K)
        K -= sj
        
        floor_b -= sb
        floor_j -= sj
        stowed_b += sb
        stowed_j += sj
        
        hist.append({
            'minute': t,
            'state': state,
            'wip': float(floor_b + floor_j),
            'utilization': float(util * 100),
            'stowed_b': float(stowed_b),
            'stowed_j': float(stowed_j),
            'rem_b': float(rem_b),
            'rem_j': float(rem_j),
            'throttled': bool(wip_current > safe_wip)
        })
        
    unstowed_vol = (total_b + total_j) - (stowed_b + stowed_j)
    
    # Objective minimizes unstowed volume heavily, then max_wip
    obj = (unstowed_vol * 1000) + max_wip
    
    result = {
        'T1': T1,
        'T2': T2,
        'max_wip': max_wip,
        'unstowed': int(unstowed_vol),
        'rem_b': int(rem_b),
        'rem_j': int(rem_j),
        'stowed_b': int(stowed_b),
        'stowed_j': int(stowed_j),
        'history': hist
    }
    
    return obj, result
