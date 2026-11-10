/** Error whose `name` becomes the Step Functions error name (Lambda errorType). */
export class FactoryError extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}

export const bulletList = (items) => items.map((item) => `- ${item}`).join('\n');
