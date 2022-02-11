export class Statement {

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

export class Term {

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

    unpacked() {
        console.error("must implement the Term class");
    }
}

export class Constant extends Term {

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

    unpacked() {
        if (this.value.startsWith('"') ||
            this.value.startsWith("<"))

            return this.value.substring(1, this.value.length - 1);

        else
            return this.value;
    }
}

export class Variable extends Term {

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

    unpacked() {
        return this.name;
    }
}

export class TermTypes {

    static CONSTANT = "CNST";
    static VARIABLE = "VARI";
}

export class TermPos {

    static S = 1;
    static P = 2;
    static O = 3;
}