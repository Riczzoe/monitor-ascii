import { api } from "./api";
import type { History } from "./history";

type Request = {path:string;active:()=>boolean;resolve:(data:History|null)=>void;reject:(error:unknown)=>void};
const queue:Request[]=[];
let running=0;
// The hub allows four simultaneous history queries. Leave one slot free.
function drain() {
  while (running<3 && queue.length) {
    const request=queue.shift()!;
    if (!request.active()) {request.resolve(null);continue;}
    running++;
    void api<History>(request.path).then(
      data => request.resolve(request.active() ? data : null),
      error => request.active() ? request.reject(error) : request.resolve(null),
    ).finally(() => {running--;drain();});
  }
}
export function pingHistory(path:string,active:()=>boolean):Promise<History|null> {
  return new Promise((resolve,reject) => {queue.push({path,active,resolve,reject});drain();});
}
