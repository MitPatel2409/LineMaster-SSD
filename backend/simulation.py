import math

DEFAULT_ASSUMPTIONS = {
    'shiftMinutes': 75.0,
    'maxSimulationMinutes': 180.0,
    'beltTravelMinutes': 3.0,
    'boxLineRatePerHour': 900.0,
    'jiffyLineRatePerHour': 1350.0,
    'aisleCapacityItems': 200.0,
    'excellentRatePerHour': 450.0,
    'goodRatePerHour': 325.0,
    'lowRatePerHour': 250.0,
    'safeWipPerStower': 15.0,
    'safeWipFloor': 50.0,
    'basePenaltyThreshold': 0.65,
    'minPenaltyThreshold': 0.20,
    'oversizeBaselineRatio': 1.0 / 36.0,
    'thresholdDropScale': 0.0223,
    'thresholdDropAmount': 0.15,
    'boxPenaltyMultiplier': 2.0,
    'objectiveTimeWeight': 1000.0,
    'objectiveUnstowedWeight': 1000.0,
    'objectiveUnfinishedPenalty': 180000.0,
    'searchWindowBuffer': 15.0,
    'searchCap': 150.0,
    'searchStepThreshold': 50.0,
    'searchStepLarge': 2.0,
}


def _merge_assumptions(overrides):
    assumptions = dict(DEFAULT_ASSUMPTIONS)

    if isinstance(overrides, dict):
        for key, value in overrides.items():
            if key in assumptions:
                assumptions[key] = float(value)

    assumptions['shiftMinutes'] = max(1.0, assumptions['shiftMinutes'])
    assumptions['maxSimulationMinutes'] = max(assumptions['shiftMinutes'], assumptions['maxSimulationMinutes'])
    assumptions['beltTravelMinutes'] = max(1, int(round(assumptions['beltTravelMinutes'])))
    assumptions['boxLineRatePerHour'] = max(1.0, assumptions['boxLineRatePerHour'])
    assumptions['jiffyLineRatePerHour'] = max(1.0, assumptions['jiffyLineRatePerHour'])
    assumptions['aisleCapacityItems'] = max(1.0, assumptions['aisleCapacityItems'])
    assumptions['safeWipPerStower'] = max(0.01, assumptions['safeWipPerStower'])
    assumptions['safeWipFloor'] = max(1.0, assumptions['safeWipFloor'])
    assumptions['basePenaltyThreshold'] = min(0.99, max(0.01, assumptions['basePenaltyThreshold']))
    assumptions['minPenaltyThreshold'] = min(
        assumptions['basePenaltyThreshold'],
        max(0.01, assumptions['minPenaltyThreshold']),
    )
    assumptions['oversizeBaselineRatio'] = max(0.0, assumptions['oversizeBaselineRatio'])
    assumptions['thresholdDropScale'] = max(0.0001, assumptions['thresholdDropScale'])
    assumptions['thresholdDropAmount'] = max(0.0, assumptions['thresholdDropAmount'])
    assumptions['boxPenaltyMultiplier'] = max(1.0, assumptions['boxPenaltyMultiplier'])
    assumptions['searchWindowBuffer'] = max(0.0, assumptions['searchWindowBuffer'])
    assumptions['searchCap'] = max(1, int(round(assumptions['searchCap'])))
    assumptions['searchStepThreshold'] = max(1.0, assumptions['searchStepThreshold'])
    assumptions['searchStepLarge'] = max(1, int(round(assumptions['searchStepLarge'])))

    return assumptions


def run_simulation(total_b, total_j, e, g, b, aisles, r_ov, r_big, r_med, r_sb, r_jiff, assumptions=None):
    assumptions = _merge_assumptions(assumptions)

    def stower_throughput_per_minute(e, g, b):
        return (
            e * (assumptions['excellentRatePerHour'] / 60.0)
            + g * (assumptions['goodRatePerHour'] / 60.0)
            + b * (assumptions['lowRatePerHour'] / 60.0)
        )

    C = stower_throughput_per_minute(e, g, b)
    system_cap = aisles * assumptions['aisleCapacityItems']
    stowers = e + g + b

    safe_wip = stowers * assumptions['safeWipPerStower']
    if safe_wip <= 0:
        safe_wip = assumptions['safeWipFloor']

    total_box_ratio = r_ov + r_big + r_med
    ov_pct = r_ov / total_box_ratio if total_box_ratio > 0 else 0.0

    base_threshold = assumptions['basePenaltyThreshold']
    baseline_ov_pct = assumptions['oversizeBaselineRatio']
    min_threshold = assumptions['minPenaltyThreshold']

    if ov_pct > baseline_ov_pct:
        diff = ov_pct - baseline_ov_pct
        drop = (diff / assumptions['thresholdDropScale']) * assumptions['thresholdDropAmount']
        threshold = max(min_threshold, base_threshold - drop)
    else:
        threshold = base_threshold

    threshold = min(base_threshold, max(min_threshold, threshold))

    best_obj = float('inf')
    best_result = None

    max_search_bound = int(
        total_b / (assumptions['boxLineRatePerHour'] / 60.0)
        + total_j / (assumptions['jiffyLineRatePerHour'] / 60.0)
    ) + int(assumptions['searchWindowBuffer'])

    search_cap = max(1, min(assumptions['searchCap'], max_search_bound))
    step = assumptions['searchStepLarge'] if search_cap > assumptions['searchStepThreshold'] else 1

    for T1 in range(0, search_cap, step):
        for T2 in range(T1, search_cap, step):
            obj, res = simulate_scenario(
                T1,
                T2,
                total_b,
                total_j,
                C,
                system_cap,
                safe_wip,
                threshold,
                assumptions,
            )
            if obj < best_obj:
                best_obj = obj
                best_result = res

    if best_result is None:
        return {
            'T1': 0,
            'T2': 0,
            'max_wip': 0.0,
            'ttc': 0,
            'unstowed': int(total_b + total_j),
            'rem_b': int(total_b),
            'rem_j': int(total_j),
            'stowed_b': 0,
            'stowed_j': 0,
            'penalty_threshold_used': float(threshold),
            'history': [],
            'status': 'failed',
            'failure_reason': 'insufficient_capacity',
            'guidance': 'Unable to find a feasible simulation path with current parameters.',
            'safe_wip_limit': float(safe_wip),
            'staffing_total': float(stowers),
            'throttle_minutes': 0,
            'estimated_stowers_needed': 0,
            'recommended_extra_stowers': 0,
            'assumptions_used': assumptions,
        }

    return enrich_result(best_result, total_b, total_j, stowers, safe_wip, assumptions)


def enrich_result(result, total_b, total_j, stowers, safe_wip, assumptions):
    enriched = dict(result)

    is_failed = enriched['ttc'] >= assumptions['maxSimulationMinutes'] or enriched['unstowed'] > 0
    throttle_minutes = int(enriched.get('throttle_minutes', 0))

    failure_reason = 'none'
    guidance = 'Operation clears within the simulated window.'
    if is_failed:
        if stowers <= 0:
            failure_reason = 'no_staffing'
            guidance = 'Add stowers before running this shift profile.'
        elif throttle_minutes >= 15:
            failure_reason = 'wip_safety_throttling'
            guidance = 'WIP hit the safety cap repeatedly. Pace cart release and increase stower support.'
        else:
            failure_reason = 'insufficient_capacity'
            guidance = 'Total stow capacity is not enough for this volume. Increase staffing or reduce backlog.'

    required_rate = (total_b + total_j) / max(assumptions['shiftMinutes'], 1.0)
    observed_rate = (enriched['stowed_b'] + enriched['stowed_j']) / max(enriched['ttc'], 1)
    throughput_per_stower = observed_rate / max(stowers, 1)

    estimated_stowers_needed = 0
    recommended_extra_stowers = 0
    if stowers > 0 and throughput_per_stower > 0:
        estimated_stowers_needed = int(math.ceil(required_rate / throughput_per_stower))
        recommended_extra_stowers = max(0, estimated_stowers_needed - int(math.ceil(stowers)))

    enriched.update(
        {
            'status': 'failed' if is_failed else 'success',
            'failure_reason': failure_reason,
            'guidance': guidance,
            'safe_wip_limit': float(safe_wip),
            'staffing_total': float(stowers),
            'throttle_minutes': throttle_minutes,
            'estimated_stowers_needed': estimated_stowers_needed,
            'recommended_extra_stowers': recommended_extra_stowers,
            'assumptions_used': assumptions,
        }
    )
    return enriched


def simulate_scenario(T1, T2, total_b, total_j, C, system_cap, safe_wip, threshold, assumptions):
    hist = []
    rem_b, rem_j = total_b, total_j

    belt = []
    floor_b = 0.0
    floor_j = 0.0
    stowed_b = 0.0
    stowed_j = 0.0
    max_wip = 0.0
    throttle_minutes = 0

    max_simulation_minutes = int(assumptions['maxSimulationMinutes'])
    belt_travel_minutes = assumptions['beltTravelMinutes']
    box_rate = assumptions['boxLineRatePerHour'] / 60.0
    jiffy_rate = assumptions['jiffyLineRatePerHour'] / 60.0
    box_penalty_multiplier = assumptions['boxPenaltyMultiplier']

    t = 0
    while ((total_b + total_j) - (stowed_b + stowed_j)) > 0.001:
        if t >= max_simulation_minutes:
            break

        if t < T1:
            state = 1  # Box / Box
        elif t < T2:
            state = 2  # Box / Jiffy
        else:
            state = 3  # Jiffy / Jiffy

        rate_l1_b = box_rate if state in [1, 2] else 0.0
        rate_l1_j = jiffy_rate if state == 3 else 0.0
        rate_l2_b = box_rate if state == 1 else 0.0
        rate_l2_j = jiffy_rate if state in [2, 3] else 0.0

        wip_current = floor_b + floor_j
        if wip_current > safe_wip:
            induct_b = 0.0
            induct_j = 0.0
            throttle_minutes += 1
        else:
            induct_b = rate_l1_b + rate_l2_b
            induct_j = rate_l1_j + rate_l2_j

            induct_b = min(induct_b, rem_b)
            rem_b -= induct_b
            induct_j = min(induct_j, rem_j)
            rem_j -= induct_j

        belt.append({'b': induct_b, 'j': induct_j, 'timer': belt_travel_minutes})

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

        util = (stowed_b + stowed_j) / max(system_cap, 1.0)
        cost_box = box_penalty_multiplier if util > threshold else 1.0

        K = C
        sb = min(floor_b, K / max(cost_box, 1.0))
        K -= sb * cost_box
        sj = min(floor_j, K)

        floor_b -= sb
        floor_j -= sj
        stowed_b += sb
        stowed_j += sj

        hist.append(
            {
                'minute': t,
                'state': state,
                'wip': float(floor_b + floor_j),
                'utilization': float(util * 100),
                'stowed_b': float(stowed_b),
                'stowed_j': float(stowed_j),
                'rem_b': float(rem_b),
                'rem_j': float(rem_j),
                'throttled': bool(wip_current > safe_wip),
            }
        )

        t += 1

    unstowed_vol = (total_b + total_j) - (stowed_b + stowed_j)
    ttc = t

    if unstowed_vol > 0.5:
        obj = (
            (unstowed_vol * assumptions['objectiveUnstowedWeight'])
            + max_wip
            + assumptions['objectiveUnfinishedPenalty']
        )
    else:
        obj = (ttc * assumptions['objectiveTimeWeight']) + max_wip

    result = {
        'T1': T1,
        'T2': T2,
        'max_wip': max_wip,
        'ttc': ttc,
        'unstowed': int(unstowed_vol),
        'rem_b': int(rem_b),
        'rem_j': int(rem_j),
        'stowed_b': int(stowed_b),
        'stowed_j': int(stowed_j),
        'penalty_threshold_used': float(threshold),
        'throttle_minutes': throttle_minutes,
        'history': hist,
        'assumptions_used': assumptions,
    }

    return obj, result
