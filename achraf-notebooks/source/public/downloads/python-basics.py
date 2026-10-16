def mean(values):
    if len(values) == 0:
        raise ValueError("empty list")
    total = 0
    for value in values:
        total += value
    return total / len(values)

print(mean([2, 4, 6]))
assert mean([2, 4, 6]) == 4
