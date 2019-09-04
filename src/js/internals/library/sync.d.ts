import Controller from '../controller'

export default class Sync {
    constructor(controller: Controller);
    stop: boolean;
    running: boolean;
    callbacks: { (): void }[];
    taskCallbacks: { (err: any): void }[];
    controller: Controller;
    register(interval?: number): void;
    unregister(): void;
    q: any;
    getTasks(cb: (jobid: string, i: any) => void, end?: () => void): void;
    queueLength(cb: (len: number) => void): void;
    sync(callback?: () => void, taskCallback?: (err: any) => void): void;
    drop(jobId: string, cb: (err?: any) => void): void;
    job(call: any, cb: (err?: any) => void, ...parameters: any[]): void;
}
