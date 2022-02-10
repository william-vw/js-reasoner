import { TermPos } from './statement.js';

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

export class NestedIterator extends DoneIterator {

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

export class FindMatchesIterator extends WrappedIterator {

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