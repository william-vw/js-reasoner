import { FunctionalBuiltin, MutatingBuiltin } from './rule.js';

export class LT extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a < b), "math");
    }
}

export class LE extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a <= b), "math");
    }
}

export class EQ extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a == b), "math");
    }
}

export class GE extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a >= b), "math");
    }
}

export class GT extends FunctionalBuiltin {

    constructor(...args) {
        super(args, (([ a, b ]) => a > b), "math");
    }
}

export class StringAppend extends MutatingBuiltin {

    constructor(...args) {
        super(args, "string");
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

export const builtins = {};

function register(builtin) {
    builtins[builtin.name] = builtin.constructor;
}

register(new LT());
register(new LE());
register(new EQ());
register(new GE());
register(new LT());
register(new StringAppend());