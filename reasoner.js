class Reasoner {

    dataset;

    rules;
    clauses;

    // (1) assuming that this dataset does not contain any data initially
    // else a saturation operation would be appropriate to initialize the reasoner

    // (2) currently assuming that rules are not added after initialization

    constructor(dataset, rules) {
        this.dataset = dataset;

        this.rules = rules;
        this.clauses = new SingleIndexStatementSet(TermPos.P);
        for (var rule of rules) {
            for (var clause of rule.body)
                this.clauses.add(clause);
        }
    }

    infer(stmt) {
        // this.clauses.print();

        console.debug("infer:", stmt + "");
        const matches = this.clauses.findMatches(stmt);
        for (var clause of matches) {
            console.debug("clause match:", clause + "");
            const rule = clause.rule;

            const stack = new BindingStack(rule);
            stack.current().bind(clause, stmt);

            console.debug("stack:", stack + "");

            const fired = this.matchBody(rule, clause, stack);
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
            this.fireRule(rule, stack.current());
            return true;
        }

        // TODO order based on selectivity
        // ... 

        const next = clauses.splice(0, 1)[0];
        const grounded = stack.current().ground(next);

        console.debug("next clause:", next + "", "(grounded:", grounded + "", ")");

        const matches = this.dataset.findMatches(grounded);
        for (const match of matches) {
            console.debug("data match:", match + "", "(clause:", next + "", ")");
            stack.windup();
            stack.current().bind(grounded, match);
            console.debug("stack:", stack + "");

            const success = this.matchClauses(rule, clauses.slice(), stack);
            
            stack.unwind();
        }
    }

    // (private)
    fireRule(rule, binding) {
        console.debug("fire rule!");
        
        const inferences = rule.head.map(c => binding.ground(c));
        for (const inference of inferences) {
            if (!this.dataset.contains(inference)) {
                this.dataset.add(inference);
                console.debug("add:", inference + "");

                this.infer(inference);
            }    
        }
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

class Rule {

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
        return this.body.map(e => e + "").join(" ") + "\n  =>\n" + this.head.map(e => e + "");
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

class StatementSet {

    constructor(stmts) {
        for (stmt in stmts)
            add(stmt);
    }

    add(stmt) {
        console.error("must implement the StatementSet class");
    }

    remove(stmt) {
        console.error("must implement the StatementSet class");
    }

    contains(stmt) {
        console.error("must implement the StatementSet class");
    }

    findMatches(stmt) {
        console.error("must implement the StatementSet class");
    }

    print() {
        console.error("must implement the StatementSet class");
    }
}

class SingleIndexStatementSet extends StatementSet {

    static varIndex = "<null>";

    index;
    stmts = {};

    constructor(index, stmts) {
        super(stmts);
        this.index = index;
    }

    add(stmt) {
        const index = this.getIndex(stmt);
        var found = this.stmts[index];
        if (found === undefined) {
            found = [];
            this.stmts[index] = found;
        }
        found.push(stmt);
    }

    // (exact match)
    remove(stmt) {
        const index = this.getIndex(stmt);
        var found = this.stmts[index];
        if (found !== undefined) {

            for (var i = 0; i < found.length; i++) {
                var stmt2 = found[i];

                if (stmt2.equals(stmt, true)) {
                    found.splice(i, 1);
                    return true;
                }
            }
        }

        return false;
    }

    // (private)
    getIndex(stmt) {
        var indexTerm = stmt.get(this.index);
        return (indexTerm.isVariable() ? SingleIndexStatementSet.varIndex : indexTerm.value);
    }

    // (non-exact matches)
    findMatches(stmt) {
        const iterator = this.getMatchingIterator(stmt);
        
        const ret = {};
        ret[Symbol.iterator] = () => iterator;
        return ret;
    }

    contains(stmt) {
        const iterator = this.getMatchingIterator(stmt);
        return iterator.next().value !== undefined;
    }

    // (private)
    getMatchingIterator(stmt) {
        const indexTerm = stmt.get(this.index);

        var iterator = null;
        if (indexTerm.isVariable())
            iterator = this.iterateAll();
        else
            iterator = this.iterate(indexTerm.value);

        const wrapper = new FindMatchesIterator(iterator, stmt);
        return wrapper;
    }

    // (private)
    iterate(term) {
        var iterators = [];

        var found = this.stmts[term];
        if (found)
            iterators.push(found.values());

        found = this.stmts[SingleIndexStatementSet.varIndex];
        if (found)
            iterators.push(found.values());

        return new NestedIterator(iterators);
    }

    // (private)
    iterateAll() {
        var allEntries = Object.values(this.stmts);
        var allIterators = allEntries.map(a => a.values());

        return new NestedIterator(allIterators);
    }

    [Symbol.iterator]() {
        return this.iterateAll();
    }

    print() {
        Object.entries(this.stmts).forEach(e => {
            const index = (e[0] ==
                SingleIndexStatementSet.varIndex ? "<wildcard>" : e[0]);
            const elements = e[1].map(v => v.toString()).join("\n");

            console.log(index, ":", elements);
        });
    }
}

class DoneIterator {

    nextMatch = false;

    next() {
        var ret = this.nextMatch;
        if (!ret)
            return { done: true };

        // don't actually know at this point whether this is the last iteration
        this.getNext();
        // only the last one if we cannot find a next match
        // .. turns out JS simply ignores entries with done=true in for .. of
        // (still, this could be useful to avoid 1-more iteration for custom code ..)
        const done = false; // (this.nextMatch === false);

        ret = { value: ret.value, done: done }
        return ret;
    }

    // (private)
    getNext() {
        console.error("must implement the DoneIterator class");
    }
}

class NestedIterator extends DoneIterator {

    iterators;

    idx = 0;

    constructor(iterators) {
        super();

        this.iterators = iterators;
        this.getNext();
    }

    // (private)
    getNext() {
        // this code is not very intuitive but it's JS' fault :(
        // technically, an iterator can return done=true either with the last element, 
        // or after the last iteration (with undefined value); 
        // an empty array will always do the latter

        // so we need to cover both these cases ..
        if (this.idx < this.iterators.length) {
            const iterator = this.iterators[this.idx];

            // there's been a prior iteration
            // and, returned value was last one for that iterator
            if (this.nextMatch !== false && this.nextMatch.done) {
                // so, goto next iterator
                this.nextIterator();

            } else {
                // either first iteration, or prior iteration that was not last one
                const ret = iterator.next();

                // in case done=true is only returned *after* last iteration
                if (ret.value !== undefined) {
                    this.nextMatch = ret;
                } else
                    this.nextIterator();
            }

        } else {
            this.nextMatch = false;
        }
    }

    // (private)
    nextIterator() {
        this.idx++;
        this.getNext();
    }
}

class WrappedIterator extends DoneIterator {

    iterator;

    constructor(iterator) {
        super();

        this.iterator = iterator;
    }
}

class FindMatchesIterator extends WrappedIterator {

    stmt;
    ignore;

    constructor(iterator, stmt, ignore) {
        super(iterator);

        this.stmt = stmt;
        this.ignore = ignore;

        this.getNext();
    }

    // (private)
    getNext() {
        while (true) {
            var result = this.iterator.next();
            if (result.value === undefined)
                break;

            const stmt2 = result.value;

            if (stmt2.equals(this.stmt, false)) {
                this.nextMatch = result;
                return;
            }

            if (result.done)
                break;
        }

        this.nextMatch = false;
    }

    equals(stmt, stmt2) {
        for (var i = TermPos.S; i <= TermPos.O; i++) {
            if (i != this.ignore) {
                if (!stmt.get(i).equals(stmt2.get(i), exact))
                    return false;
            }
        }

        return true;
    }
}

class Statement {

    s;
    p;
    o;

    constructor(s, p, o) {
        this.s = s;
        this.p = p;
        this.o = o;
    }

    get(pos) {
        switch (pos) {

            case TermPos.S:
                return this.s;

            case TermPos.P:
                return this.p;

            case TermPos.O:
                return this.o;

            default:
                console.error("[Statement.get] unknown term position:", pos);
                return null;
        }
    }

    set(pos, term) {
        switch (pos) {

            case TermPos.S:
                this.s = term;
                break;

            case TermPos.P:
                this.p = term;
                break;

            case TermPos.O:
                this.o = term;
                break;

            default:
                console.error("[Statement.set] unknown term position:", pos);
                return null;
        }
    }

    [Symbol.iterator]() {
        const stmt = this;
        return {
            idx: 1,

            next: function () {
                if (this.idx > TermPos.O)
                    return { done: true };
                else {
                    const value = stmt.get(this.idx);
                    const done = false; // this.idx == TermPos.O;
                    this.idx++;
                    return { value: value, done: done };
                }
            }
        };
    }

    includesVariables() {
        for (const term of this) {
            if (term.isVariable())
                return true;
        }

        return false;
    }

    equals(stmt2, exact) {
        return this.s.equals(stmt2.s, exact) &&
            this.p.equals(stmt2.p, exact) &&
            this.o.equals(stmt2.o, exact);
    }

    toString() {
        return `${this.s} ${this.p} ${this.o} .`;
    }
}

class Clause extends Statement {

    rule;
    pos;

    constructor(s, p, o) {
        super(s, p, o);
    }
}

class Term {

    type;

    constructor(type) {
        this.type = type;
    }

    isConstant() {
        return this.type === TermTypes.CONSTANT;
    }

    isVariable() {
        return this.type === TermTypes.VARIABLE;
    }

    equals(other, exact) {
        console.error("must implement the Term class");
    }
}

class Constant extends Term {

    value;

    constructor(value) {
        super(TermTypes.CONSTANT);
        this.value = value;
    }

    equals(other, exact) {
        if (exact) {
            if (other.isVariable())
                return false;

        } else if (other.isVariable())
            return true;

        return this.value === other.value;
    }

    toString() {
        return this.value;
    }
}

class Variable extends Term {

    name;
    idx;

    constructor(name) {
        super(TermTypes.VARIABLE);
        this.name = name;
    }

    equals(other, exact) {
        if (exact) {
            if (other.isConstant())
                return false;
            else
                return this.name === other.name;

        } else
            return true;
    }

    toString() {
        return "?" + this.name + (this.idx !== undefined ? `(${this.idx})` : "");
    }
}

class TermTypes {

    static CONSTANT = "CNST";
    static VARIABLE = "VARI";
}

class TermPos {

    static S = 1;
    static P = 2;
    static O = 3;
}