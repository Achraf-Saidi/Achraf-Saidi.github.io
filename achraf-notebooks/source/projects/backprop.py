"""Central finite differences independently check all four parameters."""
import math, json

def loss(params):
    w1,b1,w2,b2=params
    h=math.tanh(w1+b1)
    return .5*(w2*h+b2-1)**2
p=[.5,0.,2.,0.]
h=math.tanh(p[0]+p[1]);delta=p[2]*h+p[3]-1
analytic=[delta*p[2]*(1-h*h),delta*p[2]*(1-h*h),delta*h,delta]
numeric=[]
for i in range(4):
    plus,minus=p.copy(),p.copy();plus[i]+=1e-6;minus[i]-=1e-6
    numeric.append((loss(plus)-loss(minus))/(2e-6))
errors=[abs(a-b) for a,b in zip(analytic,numeric)]
assert max(errors)<1e-8
print(json.dumps(dict(loss=loss(p),analytic_gradients=analytic,numeric_gradients=numeric,max_absolute_error=max(errors)),indent=2))
