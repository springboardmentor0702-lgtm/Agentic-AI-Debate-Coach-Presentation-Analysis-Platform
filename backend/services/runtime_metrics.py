import time

START_TIME = time.time()

def get_runtime_seconds():
    return max(0, int(time.time() - START_TIME))
