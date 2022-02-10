import { FnBuiltin } from './rule.js';

export class LT extends FnBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a < b));
    }
}

export class LE extends FnBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a <= b));
    }
}

export class EQ extends FnBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a == b));
    }
}

export class GE extends FnBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a >= b));
    }
}

export class GT extends FnBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a > b));
    }
}