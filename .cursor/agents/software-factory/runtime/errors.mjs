/** Error raised inside an execution. `name` is the ASL error name matched by Retry and Catch. */
export class StatesError extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}

/** Error returned by a service API call, mirroring the Step Functions API error codes. */
export class ServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}
