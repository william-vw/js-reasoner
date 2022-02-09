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

    getIndex(stmt) {
        var indexTerm = stmt.get(this.index);
        return (indexTerm.isVariable() ? SingleIndexStatementSet.varIndex : indexTerm.value);
    }

    // (non-exact matches)

    findMatches(stmt) {
        const indexTerm = stmt.get(this.index);

        var iterator = null;
        if (indexTerm.isVariable())
            iterator = this.iterateAll();
        else
            iterator = this.iterate(indexTerm.value);

        const wrapper = new FindMatchesIterator(iterator, stmt);

        const ret = {};
        ret[Symbol.iterator] = () => wrapper;
        return ret;
    }

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

    iterateAll() {
        var allEntries = Object.values(this.stmts);
        var allIterators = allEntries.map(a => a.values());

        return new NestedIterator(allIterators);
    }

    [Symbol.iterator] () {
        return this.iterateAll();
    }

    print() {
        Object.entries(this.stmts).forEach(e => {
            const index = e[0];
            const elements = e[1].map(v => v.toString()).join(", ");

            console.log(index, ":", elements);
        });
    }
}

class CustomIterator {

    nextMatch = false;

    next() {
        var ret = this.nextMatch;
        if (!ret)
            return { done: true };

        // don't actually know at this point whether this is the last iteration
        this.getNext();
        // only last one if we cannot find a next match
        // JS ignores entries with done=true XD
        const done = false; // (this.nextMatch === false);

        ret = { value: ret.value, done: done }
        return ret;
    }

    // private
    getNext() {
        console.error("must implement the CustomIterator class");
    }
}

class NestedIterator extends CustomIterator {

    iterators;

    idx = 0;

    constructor(iterators) {
        super();

        this.iterators = iterators;
        this.getNext();
    }

    // private
    getNext() {
        // this code is not very intuitive but it's JS' fault!
        // an iterator can return done=true either with the last element, 
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

    nextIterator() {
        this.idx++;
        this.getNext();
    }
}

class WrappedIterator extends CustomIterator {

    iterator;

    constructor(iterator) {
        super();
        
        this.iterator = iterator;
    }
}

class FindMatchesIterator extends WrappedIterator {

    stmt;

    constructor(iterator, stmt) {
        super(iterator);

        this.stmt = stmt;

        this.getNext();
    }

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

    toString() {
        return `${this.s} ${this.p} ${this.o}`;
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
        return "?" + this.name;
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