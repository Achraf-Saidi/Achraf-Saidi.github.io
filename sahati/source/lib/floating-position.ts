export type DockSide='left'|'right';
export type DockPreference={side:DockSide;ratio:number};
export type FloatingPoint={x:number;y:number};
export type FloatingBounds={left:number;right:number;top:number;bottom:number};
export function clampFloating(p:FloatingPoint,b:FloatingBounds):FloatingPoint{return {x:Math.max(b.left,Math.min(b.right,p.x)),y:Math.max(b.top,Math.min(b.bottom,p.y))};}
export function readDockPreference(value:any):DockPreference|undefined{if(!value||!['left','right'].includes(value.side)||typeof value.ratio!=='number'||!Number.isFinite(value.ratio))return;return {side:value.side,ratio:Math.max(0,Math.min(1,value.ratio))};}
export function restoreFloating(p:DockPreference,b:FloatingBounds):FloatingPoint{return {x:p.side==='left'?b.left:b.right,y:b.top+(b.bottom-b.top)*p.ratio};}
export function dockFloating(p:FloatingPoint,b:FloatingBounds,side?:DockSide){const point=clampFloating(p,b),dock=side||(point.x<(b.left+b.right)/2?'left':'right');return {point:{x:dock==='left'?b.left:b.right,y:point.y},preference:{side:dock,ratio:b.bottom===b.top?0:(point.y-b.top)/(b.bottom-b.top)} as DockPreference};}
