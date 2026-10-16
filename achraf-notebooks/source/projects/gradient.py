"""Synthetic algebra check, not a claim about real-world prediction."""
import json
x, y = [0., 1., 2.], [1., 3., 5.]
w = b = 0.0
rate = .1
for iteration in range(300):
    errors = [w*xi+b-yi for xi, yi in zip(x,y)]
    dw = 2*sum(e*xi for e,xi in zip(errors,x))/len(x)
    db = 2*sum(errors)/len(x)
    w,b = w-rate*dw,b-rate*db
mse = sum((w*xi+b-yi)**2 for xi,yi in zip(x,y))/len(x)
assert abs(w-2)<1e-6 and abs(b-1)<1e-6
print(json.dumps(dict(w=w,b=b,mse=mse),indent=2))
