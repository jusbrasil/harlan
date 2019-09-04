export class ApplicationState {
    constructor(authData: any, callback?: () => void);
    namespace: string;
    state: any;
    configure(state: any): void;
    applicationState: any;
}
