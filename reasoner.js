class Reasoner {

    dataset;
    ruleClauses = {};

    // (1) assuming that this dataset does not contain any data initially
    // else a saturation operation would be appropriate to initialize the reasoner

    // (2) currently assuming that rules are not added after initialization

    constructor(dataset, ruleset) {
        this.dataset = dataset;


    }

    infer(item) {

    }
}

class RuleClauseSet {

    set;

    constructor(set) {
        this.set = set;
    }

    add(rule) {
        console.error("must implement the RuleClauseIndex class");
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
}

class SingleIndexStatementSet extends StatementSet {

    static varIndex = null;

    index;
    stmts = {};

    constructor(index, stmts) {
        super(stmts);
        this.index = index;
    }

    add(stmt) {
        const indexTerm = this.getIndexTerm(stmt);
        var found = this.stmts[indexTerm];
        if (found === undefined) {
            found = [];
            this.stmts[indexTerm] = found;
        }
        found.push(stmt);
    }

    remove(stmt) {
        const indexTerm = this.getIndexTerm(stmt);
        var found = this.stmts[indexTerm];
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

    getIndexTerm(stmt) {
        var indexTerm = stmt.get(this.index);
        return (indexTerm.isVariable() ? this.varIndex : indexTerm);
    }

    findMatches(stmt) {
        const indexTerm = stmt.get(this.index);

        var iterator = null;
        if (indexTerm.isVariable())
            iterator = this.iterateAll();
        else
            iterator = this.iterate(indexTerm);

        return ret;
    }

    iterate(term) {
        var iterators = [];

        var found = this.stmts[indexTerm];
        if (found)
            iterators.push(found.values());

        found = this.stmts[this.varIndex];
        if (found)
            iterators.push(found.values());

        return new NestedIterator(iterators.values());
    }

    iterateAll() {
        return new NestedIterator(this.stmts.values());
    }
}

class CustomIterator {

    nextMatch = false;

    next() {
        const ret = this.nextMatch;
        if (!ret)
            return { done: true };

        // don't actually know at this point whether this is the last iteration
        this.getNext();
        // only last one if we cannot find a next match
        const done = (this.nextMatch === false);

        return { value: ret.value, done: done };
    }

    // private
    getNext() {
        console.error("must implement the CustomIterator class");
    }
}

class NestedIterator extends CustomIterator {

    iterators;

    current;
    nextMatch = false;

    constructor(iterators) {
        this.iterators = iterators;

        this.getNext();
    }

    // private
    getNext() {
        // initialize
        if (this.current === undefined) {
            this.current = this.iterators.next();
            
            // ("iterators" was empty array)
            if (this.current.value === undefined)
                return;
        }

        // there's been a prior iteration
        // and, that was the last one for that iterator
        if (this.nextMatch !== false && this.nextMatch.done) {
            // so, goto next iterator
            this.nextIterator();
        
        } else {
            // either first iteration, or prior iteration that was not last one
            const ret = this.current.value.next();

            // not an empty array
            if (ret.value !== undefined) {
                this.nextMatch = ret;

            } else
                // empty array, so goto next iterator
                this.nextIterator();
        }
    }

    nextIterator() {
        // no more iterators
        if (this.current.done)
            this.nextMatch = false;

        else {
            this.current = this.iterators.next();
            this.getNext();
        }
    }
}

class WrappedIterator extends CustomIterator {

    iterator;

    constructor(iterator) {
        this.iterator = iterator;
    }
}

class FindMatchesIterator extends WrappedIterator {

    stmt;
    nextMatch = false;

    constructor(iterator, stmt) {
        this.iterator = iterator;
        this.stmt = stmt;

        this.getNext();
    }

    getNext() {
        while (true) {
            var result = this.iterator.next();
            // empty array
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
                console.error("unknown term position:", pos);
                return null;
        }
    }

    equals(otherStmt, exact) {
        return this.s.equals(otherStmt.s, exact) &&
            this.p.equals(otherStmt.p, exact) &&
            this.o.equals(otherStmt.o, exact);
    }
}

class Term {

    type;

    constructor(type) {
        this.type = type;
    }

    isConstant() {
        return type === TermTypes.CONSTANT;
    }

    isVariable() {
        return type === TermTypes.VARIABLE;
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

        return this.value === otherCnst.value;
    }
}

class Variable extends Term {

    name;

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
}

class TermTypes {

    static CONSTANT = 1;
    static VARIABLE = 2;
}

class TermPos {

    static S = 1;
    static P = 2;
    static O = 3;
}