import traceback
from simulation import run_simulation
try:
    print("running")
    res = run_simulation(1500, 3000, 2, 3, 1, 10, 1, 10, 25, 1, 5)
    print("Success")
except Exception as e:
    traceback.print_exc()
