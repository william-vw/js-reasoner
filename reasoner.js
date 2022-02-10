import { Statement, TermPos } from './statement.js';
import { SingleIndexStatementSet } from './set.js';

export class Reasoner {

    dataset;

    rules;
    clauses;

    // (1) assuming that this dataset does not contain any data initially
    // else a saturation operation would be appropriate to initialize the reasoner

    // (2) currently assuming that rules are not added after initialization

    constructor(rules, dataset) {
        this.rules = rules;
        this.dataset = dataset;

        this.clauses = new SingleIndexStatementSet(TermPos.P);
        for (var rule of rules) {
            for (var clause of rule.body)
                this.clauses.add(clause);
        }
    }

    infer(stmt) {
        // this.clauses.print();

        console.debug("infer for:", stmt + "");
        const matches = this.clauses.findMatches(stmt);
        for (var clause of matches) {
            const rule = clause.rule;

            const descr = clause + " <> " + stmt + "\n(rule: " + rule + ")";
            console.debug("clause match:", descr);

            const stack = new BindingStack(rule);
            stack.current().bind(clause, stmt);

            console.debug("stack:", stack + "");

            const fired = this.matchBody(rule, clause, stack);
            console.log("fired?", fired, "for", descr);
        }
    }

    // (private)
    matchBody(rule, clause, stack) {
        const remaining = rule.body.slice();
        remaining.splice(clause.pos, 1);

        return this.matchClauses(rule, remaining, stack);
    }

    // (private)
    matchClauses(rule, clauses, stack) {
        if (clauses.length == 0) {
            return this.fireRule(rule, stack.current());
        }

        // TODO order based on selectivity
        // ... 

        const next = clauses.splice(0, 1)[0];
        const grounded = stack.current().ground(next);

        console.debug("next clause:", next + "", "(grounded:", grounded + "", ")");

        var anySuccess = false;

        const matches = this.dataset.findMatches(grounded);
        for (const match of matches) {
            console.debug("data match:", match + "", "(clause:", next + "", ")");
            
            stack.windup();
            stack.current().bind(grounded, match);
            console.debug("stack:", stack + "");

            const success = this.matchClauses(rule, clauses.slice(), stack);
            anySuccess = anySuccess || success;

            stack.unwind();
        }

        return anySuccess;
    }

    // (private)
    fireRule(rule, binding) {
        console.debug("fire rule!");

        var anySuccess = false;

        const inferences = rule.head.map(c => binding.ground(c));
        for (const inference of inferences) {
            if (inference.includesVariables())
                console.error("inferring variable statement:", inference + "");
            else {
                if (!this.dataset.contains(inference)) {
                    console.debug("inferred new:", inference + "");
                    this.dataset.add(inference);

                    anySuccess = true;
                }
            }
        }

        return anySuccess;
    }
}

class Stack {

    stack = [];

    // constructor(...elements) {
    //     for (const e of elements)
    //         this.stack.push(e);
    // }

    push(e) {
        this.stack.push(e);
    }

    peek() {
        return this.stack[this.stack.length - 1];
    }

    pop() {
        this.stack.pop();
    }

    toString() {
        return this.stack.reduce((acc, cur) => cur + "\n" + acc, "").trim();
    }
}

class BindingStack extends Stack {

    constructor(rule) {
        super();

        this.initialize(rule);
    }

    current() {
        return this.peek();
    }

    windup() {
        const binding = this.current();
        this.push(binding.copy());
    }

    unwind() {
        this.pop();
    }

    // (private)
    initialize(rule) {
        this.push(new Binding(rule));
    }
}

class Binding {

    rule;
    array;

    constructor(rule) {
        this.rule = rule;
        this.array = new Array(rule.numVars());
    }

    ground(clause) {
        if (!clause.includesVariables())
            return clause;

        var grounded = new Statement();
        for (var i = TermPos.S; i <= TermPos.O; i++) {
            const term = clause.get(i);

            if (term.isVariable() && this.isBound(term))
                grounded.set(i, this.getBinding(term));
            else
                grounded.set(i, term);
        }

        return grounded;
    }

    bind(clause, stmt) {
        for (var i = TermPos.S; i <= TermPos.O; i++) {
            const term = clause.get(i);

            if (term.isVariable())
                this.bindVar(term, stmt.get(i));
        }
    }

    copy() {
        const copy = new Binding(this.rule);
        copy.array = this.array.slice();

        return copy;
    }

    // (private)
    isBound(vari) {
        return this.array[vari.idx] !== undefined;
    }

    // (private)
    getBinding(vari) {
        return this.array[vari.idx];
    }

    // (private)
    bindVar(vari, cnst) {
        this.array[vari.idx] = cnst;
    }

    toString() {
        return "[" + this.array.map((e, i) => `${i}:${e}`).join(", ") + "]";
    }
}

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

export class Clause extends Statement {

    rule;
    pos;

    constructor(s, p, o) {
        super(s, p, o);
    }
}