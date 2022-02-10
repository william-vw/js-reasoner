import { Statement, Constant } from './statement.js';

export class Rule {

    body;
    head;

    visitor = new RuleVisitor(this);

    constructor(body, head) {
        this.body = body;
        this.visitor.visitBody(body);

        this.head = head;
        this.visitor.visitHead(head);
    }

    numVars() {
        return this.visitor.numVars;
    }

    toString() {
        return "{" + this.body.map(e => e + "").join(" ") + " } => { " + this.head.map(e => e + "") + " }";
    }
}

class RuleVisitor {

    rule;

    numVars = 0;
    varMap = {};

    constructor(rule) {
        this.rule = rule;
    }

    visitBody(clauses) {
        for (var i = 0; i < clauses.length; i++) {
            var clause = clauses[i];
            clause.pos = i;

            this.visitClause(clause);
        }
    }

    visitHead(clauses) {
        clauses.forEach(c => this.visitClause(c));
    }

    visitClause(clause) {
        clause.rule = this.rule;

        for (const term of clause)
            this.visitTerm(term);
    }

    visitTerm(term) {
        if (term.isVariable()) {
            if (!(term.name in this.varMap))
                this.varMap[term.name] = this.numVars++;

            term.idx = this.varMap[term.name];
        }
    }
}

// class Clause {

//     type;

//     constructor(type) {
//         this.type = type;
//     }
// }

export class ClauseTypes {

    static PATTERN = 'PATTERN';
    static BUILTIN = 'BUILTIN';
}

export class Pattern extends Statement /* Clause */ {

    rule;
    pos;

    // stmt;
    type = ClauseTypes.PATTERN;

    constructor(s, p, o) {
        // super(ClauseTypes.PATTERN);
        super(s, p, o);

        // this.stmt = new Statement(s, p, o);
    }
}

export class Builtin /* extends Clause */ {

    type = ClauseTypes.BUILTIN;
    args;

    constructor(args) {
        // super(ClauseTypes.BUILTIN);
        this.args = args;
    }

    evaluate(grounded, bindings) {
        console.error("must implement the Builtin class");
    }

    [Symbol.iterator]() {
        const builtin = this;

        return {
            idx: 0,
            next: function () {
                if (this.idx >= builtin.args.length)
                    return { done: true };
                else {
                    const value = builtin.args[this.idx]
                    const done = false; // this.idx == (builtin.args.length - 1);
                    this.idx++;
                    return { value: value, done: done };
                }
            }
        };
    }

    toString() {
        return this.getId() + "(" + this.args.map(a => a + "").join(", ") + ")";
    }

    // (private)
    getId() {
        return this.constructor.name;
    }
}

export class FunctionalBuiltin extends Builtin {

    fn;

    constructor(args, fn) {
        super(args);

        this.fn = fn;
    }

    evaluate(grounded, bindings) {
        return this.fn(grounded);
    }
}

export class MutatingBuiltin extends Builtin {

    constructor(args) {
        super(args);
    }

    evaluate(ground, bindings) {
        if (!this.checkInputTerms(ground))
            return false;

        const result = this.op(ground);
        const term = new Constant(result);

        const output = this.getOutputTerm(ground);
        if (output.isVariable()) {
            bindings.bindVar(output, term);
            return true;

        } else {
            return term.equals(output);
        }
    }

    // TODO subclasses need to manually ignore the last element in ground
    // (this represents the output variable)
    op(ground) {
        console.error("must implement the MutatingBuiltin class");
    }

    // (private)
    checkInputTerms(ground) {
        for (var i = 0; i < ground.length - 1; i++) {
            const term = ground[i];

            if (term.isVariable()) {
                console.error("[" + this.getId() + "] unbound variable in builtin:", term + "");
                return false;
            }
        }

        return true;
    }

    // (private)
    getOutputTerm(ground) {
        return ground[ground.length - 1];
    }
}