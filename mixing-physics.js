/** Reduced microfluidic transport model. All physical inputs are SI. */
export const MIXING_DEFAULTS=Object.freeze({width:100e-6,length:0.01,speed:0.001,diffusivity:1e-10,interfaces:1,cells:128,steps:400});
export function mixingScales(input={}){
  const p={...MIXING_DEFAULTS,...input};
  for(const k of ['width','speed','diffusivity'])if(!Number.isFinite(p[k])||p[k]<=0)throw new RangeError(`${k} must be positive and finite.`);
  if(!Number.isFinite(p.length)||p.length<0)throw new RangeError('length must be nonnegative and finite.');
  if(![1,2,4,8].includes(p.interfaces))throw new RangeError('Choose 1, 2, 4, or 8 interfaces.');
  const residence=p.length/p.speed,Fo=p.diffusivity*residence/p.width**2,pe=p.speed*p.width/p.diffusivity,diffusionTime=(p.width/p.interfaces)**2/p.diffusivity;
  if(![residence,Fo,pe,diffusionTime].every(Number.isFinite))throw new RangeError('Parameters exceed the numerical range.');
  return {...p,residence,Fo,pe,diffusionTime,layerScale:p.width/p.interfaces};
}
function checkDiscretization(cells,steps){if(!Number.isInteger(cells)||cells<16||cells>512||cells%16)throw new RangeError('Cells must be a multiple of 16, from 16 to 512.');if(!Number.isInteger(steps)||steps<1||steps>6400)throw new RangeError('Time steps must be 1 to 6400.');}
function inletAt(s,n){return Math.cos(n*Math.PI*s)>=0?0:1;}
/** Cosine Fourier solution, evaluated as cell averages for a fair FV comparison. */
export function analyticalProfile(cells,Fo,interfaces=1){
  checkDiscretization(cells,1);if(!Number.isFinite(Fo)||Fo<0)throw new RangeError('Diffusion time must be nonnegative and finite.');
  if(![1,2,4,8].includes(interfaces))throw new RangeError('Invalid interface count.');
  if(Fo===0)return Array.from({length:cells},(_,j)=>inletAt((j+.5)/cells,interfaces));
  const result=Array(cells).fill(.5);
  const limit=Math.min(4095,Math.max(1,Math.ceil(Math.sqrt(36/Fo)/(Math.PI*interfaces))));
  for(let m=1;m<=limit;m+=2){const k=m*interfaces*Math.PI,z=k/(2*cells),sinc=Math.sin(z)/z,coeff=-2*Math.sin(m*Math.PI/2)/(m*Math.PI)*Math.exp(-k*k*Fo)*sinc;
    if(Math.abs(coeff)<1e-16)continue;for(let j=0;j<cells;j++)result[j]+=coeff*Math.cos(k*(j+.5)/cells);
  }
  return result;
}
/** Exact continuous-area RMS mixing index: 0 segregated; 1 uniform. */
export function exactMixingIndex(Fo,interfaces=1){
  if(!Number.isFinite(Fo)||Fo<0)throw new RangeError('Diffusion time must be nonnegative and finite.');
  if(![1,2,4,8].includes(interfaces))throw new RangeError('Invalid interface count.');
  if(Fo===0)return 0;let sum=0;
  for(let m=1;m<20000;m+=2){const term=Math.exp(-2*(m*interfaces*Math.PI)**2*Fo)/(m*m);sum+=term;if(term<1e-17)break;}
  return Math.max(0,Math.min(1,1-Math.sqrt(8*sum/Math.PI**2)));
}
export function profileMixingIndex(c){const mean=c.reduce((a,b)=>a+b,0)/c.length;const variance=c.reduce((a,b)=>a+(b-mean)**2,0)/c.length;return Math.max(0,Math.min(1,1-2*Math.sqrt(variance)));}
/** Conservative cell-centered finite volume + backward Euler, no wall flux. */
export function numericalProfile(cells,Fo,interfaces=1,steps=400){
  checkDiscretization(cells,steps);if(!Number.isFinite(Fo)||Fo<0)throw new RangeError('Diffusion time must be nonnegative and finite.');if(![1,2,4,8].includes(interfaces))throw new RangeError('Invalid interface count.');
  let c=analyticalProfile(cells,0,interfaces);if(Fo===0)return c;
  const r=Fo*cells*cells/steps;if(!Number.isFinite(r))throw new RangeError('Discretization exceeds numerical range.');
  const diagonal=Array(cells).fill(1+2*r);diagonal[0]=diagonal[cells-1]=1+r;
  const cp=new Float64Array(cells),den=new Float64Array(cells);den[0]=diagonal[0];cp[0]=-r/den[0];
  for(let j=1;j<cells;j++){den[j]=diagonal[j]+r*cp[j-1];cp[j]=j===cells-1?0:-r/den[j];}
  const rhs=new Float64Array(cells);
  for(let step=0;step<steps;step++){rhs[0]=c[0]/den[0];for(let j=1;j<cells;j++)rhs[j]=(c[j]+r*rhs[j-1])/den[j];c[cells-1]=rhs[cells-1];for(let j=cells-2;j>=0;j--)c[j]=rhs[j]-cp[j]*c[j+1];}
  return c;
}
export function mixingSolve(input={}){const p=mixingScales(input);checkDiscretization(p.cells,p.steps);const analytical=analyticalProfile(p.cells,p.Fo,p.interfaces),numerical=numericalProfile(p.cells,p.Fo,p.interfaces,p.steps);const error=Math.max(...numerical.map((v,i)=>Math.abs(v-analytical[i]))),mass=numerical.reduce((a,b)=>a+b,0)/p.cells;
  let lo=0,hi=1;for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(exactMixingIndex(mid,1)<.9)lo=mid;else hi=mid;}const targetTime=((lo+hi)/2)*p.width**2/(p.diffusivity*p.interfaces**2);
  return {...p,analytical,numerical,error,mass,massError:Math.abs(mass-.5),analyticalMixing:exactMixingIndex(p.Fo,p.interfaces),numericalMixing:profileMixingIndex(numerical),targetTime,targetLength:targetTime*p.speed};
}
