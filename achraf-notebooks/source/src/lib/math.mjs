export const secant=(x,h)=>2*x+h;
export function bayes(p,s,c){const tp=p*s,fp=(1-p)*(1-c);return {tp,fp,posterior:tp/(tp+fp)};}
export const transform=(a,b,c,d,x,y)=>[a*x+b*y,c*x+d*y];
export const mse=(w,b,x=[0,1,2],y=[1,3,5])=>x.reduce((s,v,i)=>s+(w*v+b-y[i])**2,0)/x.length;
export function step(w,b,rate,x=[0,1,2],y=[1,3,5]){let dw=0,db=0;for(let i=0;i<x.length;i++){const e=w*x[i]+b-y[i];dw+=2*e*x[i]/x.length;db+=2*e/x.length;}return {w:w-rate*dw,b:b-rate*db,dw,db};}
export function backprop(w1=.5,w2=2,x=1,y=1){const z=w1*x,h=Math.tanh(z),prediction=w2*h,loss=.5*(prediction-y)**2,delta=prediction-y;return{z,h,prediction,loss,dw2:delta*h,dw1:delta*w2*(1-h*h)*x};}
export function scoreNumeric(answer,expected,tolerance=.001){return String(answer).trim()!==''&&Number.isFinite(Number(answer))&&Math.abs(Number(answer)-expected)<=tolerance;}
