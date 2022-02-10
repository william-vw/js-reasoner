import { NestedIterator, FindMatchesIterator } from './iterator.js';

class StatementSet {

    reasoner;

    constructor(reasoner) {
        if (reasoner !== undefined) {
            this.reasoner = reasoner;
            reasoner.dataset = this;
        }
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

    // (private)
    onAdd(stmt) {
        if (this.reasoner !== undefined)
            this.reasoner.infer(stmt);
    }
}

export class SingleIndexStatementSet extends StatementSet {

    static varIndex = "<null>";

    index;
    stmts = {};

    constructor(index, reasoner) {
        super(reasoner);

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
        
        this.onAdd(stmt);
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
