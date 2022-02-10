import { FunctionalBuiltin, MutatingBuiltin } from './rule.js';

export class LT extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a < b));
    }
}

export class LE extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a <= b));
    }
}

export class EQ extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a == b));
    }
}

export class GE extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a >= b));
    }
}

export class GT extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a > b));
    }
}

export class StringAppend extends MutatingBuiltin {

    constructor(...args) {
        super(args);
    }

    op(ground) {
        var ret = "";

        for (var i = 0; i < ground.length - 1; i++) {
            const cnst = ground[i];
            ret += cnst.value;
        }

        return ret;
    }
}